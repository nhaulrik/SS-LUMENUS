/**
 * server/routes/opencode-agentic.js
 *
 * POST /api/opencode/agentic/plan  — orchestration only, SSE stream
 * POST /api/opencode/agentic/run   — parallel generation, SSE stream
 *
 * Pipeline:
 *   1. Read AI Context files
 *   2. Orchestrator call  → instance counts + per-instance verbatim context slices
 *   3. Parallel agents    → blocks/shared agent + one agent per instance
 *   4. Assemble + validate → emit done with final JSON
 *
 * SSE event types:
 *   phase        string   'analyzing' | 'planning' | 'generating' | 'assembling'
 *   log          string   timestamped log line
 *   agents       JSON     [{ id, label, state:'pending' }]
 *   agent_update JSON     { id, state:'running'|'done'|'error' }
 *   done         string   final JSON (auto-fills JSON Response field)
 *   error        string   error message
 */

import express from 'express'
import fsp     from 'fs/promises'
import path    from 'path'
import { callAi }              from '../lib/ai-client.js'
import { readContextFiles, readContextFilesCompact, extractGroupedSlices, getSummaryStatus } from '../lib/context-reader.js'
import { validateHtmlJson }    from '../lib/html-recipe-builder.js'
import { generateSummaries }   from '../lib/summary-generator.js'
import {
  buildOrchestratorPrompt,
  buildBlocksPrompt,
  buildInstancePrompt,
} from '../lib/agentic-prompts.js'
import { RESOLVED_PROJECTS_DIR } from '../config.js'

const router = express.Router()

// ── Helpers ────────────────────────────────────────────────────────────────────

function ts() {
  return new Date().toISOString().slice(11, 22) // HH:MM:SS.ms
}

function emit(res, type, data) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data)
  res.write(`event: ${type}\ndata: ${payload}\n\n`)
}

// Walk text from `start` and return the index after the matching closeChar.
// Respects string literals and escape sequences. Returns -1 if unbalanced.
function findBalancedEnd(text, start, openChar, closeChar) {
  let depth = 0, inString = false, escaped = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (escaped)                               { escaped = false; continue }
    if (c === '\\')                            { escaped = true;  continue }
    if (c === '"')                             { inString = !inString; continue }
    if (inString)                              continue
    if (c === openChar)                        depth++
    else if (c === closeChar && --depth === 0) return i + 1
  }
  return -1
}

/**
 * Enhanced JSON extraction with multiple strategies.
 * Returns { parsed, strategy } on success, throws with diagnostics on failure.
 */
function parseJson(text) {
  // Strategy 1: fenced code blocks (json, js, or bare)
  for (const pattern of [
    /```\s*(?:json|JSON)\s*([\s\S]*?)```/,
    /```\s*(?:javascript|js)\s*([\s\S]*?)```/,
    /```\s*([\s\S]*?)```/,
  ]) {
    const match = text.match(pattern)
    if (match) {
      try { return { parsed: JSON.parse(match[1].trim()), strategy: 'fenced-block' } } catch {}
    }
  }

  // Strategy 2: balanced JSON object
  const objectStart = text.indexOf('{')
  if (objectStart !== -1) {
    const endIdx = findBalancedEnd(text, objectStart, '{', '}')
    if (endIdx > objectStart) {
      try { return { parsed: JSON.parse(text.substring(objectStart, endIdx)), strategy: 'bracket-matched-object' } } catch {}
    }
  }

  // Strategy 3: balanced JSON array
  const arrayStart = text.indexOf('[')
  if (arrayStart !== -1) {
    const endIdx = findBalancedEnd(text, arrayStart, '[', ']')
    if (endIdx > arrayStart) {
      try { return { parsed: JSON.parse(text.substring(arrayStart, endIdx)), strategy: 'bracket-matched-array' } } catch {}
    }
  }

  // Strategy 4: full text
  try { return { parsed: JSON.parse(text.trim()), strategy: 'full-text' } } catch {}

  throw new Error(
    `All JSON extraction strategies failed.\n` +
    `Text length: ${text.length} chars\n` +
    `Text preview (first 500 chars):\n${text.substring(0, 500)}`
  )
}

/**
 * Call the AI and parse the response as JSON.
 * Uses enhanced multi-strategy parsing with smart repair attempts.
 * 
 * Returns: { parsed, raw, strategy, wasRepaired, repairAttempts }
 */
async function callAiJson(prompt, options = {}) {
  const result = await callAi(prompt, options)
  let parseResult

  // Attempt 1: Try enhanced parsing on raw response
  try {
    parseResult = parseJson(result.response)
    console.log(`[callAiJson] Parse succeeded on attempt 1 using strategy: ${parseResult.strategy}`)
    return {
      parsed: parseResult.parsed,
      raw: result.response,
      strategy: parseResult.strategy,
      wasRepaired: false,
      repairAttempts: 0,
    }
  } catch (firstErr) {
    console.warn('[callAiJson] Parse attempt 1 failed:', firstErr.message)
  }

  // Repair attempt 1: Ask for strict JSON-only response
  console.log('[callAiJson] Attempting repair 1: strict JSON-only format')
  const repairPrompt1 =
    `You previously returned text that contains JSON but is not valid. ` +
    `Extract and return ONLY the raw JSON object or array — nothing else.\n` +
    `- Do not include markdown code fences\n` +
    `- Do not include explanatory text before or after\n` +
    `- Do not include comments\n` +
    `- Start with { or [ and end with } or ]\n` +
    `- Ensure all strings are properly quoted\n` +
    `- Ensure all braces and brackets are balanced\n\n` +
    `Original response to repair:\n${result.response}`

  const retry1 = await callAi(repairPrompt1, {
    maxTokens: options.maxTokens ?? 3000,
    temperature: 0,
  })

  try {
    parseResult = parseJson(retry1.response)
    console.log(`[callAiJson] Parse succeeded on repair 1 using strategy: ${parseResult.strategy}`)
    return {
      parsed: parseResult.parsed,
      raw: retry1.response,
      strategy: parseResult.strategy,
      wasRepaired: true,
      repairAttempts: 1,
    }
  } catch (secondErr) {
    console.warn('[callAiJson] Repair 1 failed:', secondErr.message)
  }

  // Repair attempt 2: Extract the JSON object/array and ask to fix it
  console.log('[callAiJson] Attempting repair 2: JSON fragment extraction and validation')
  const extractPrompt =
    `Extract the JSON object or array from this text (even if incomplete or malformed).\n` +
    `Return ONLY the JSON, fixing any obvious issues:\n` +
    `- Add missing closing braces/brackets\n` +
    `- Fix unescaped quotes in strings\n` +
    `- Fix trailing commas\n` +
    `- Ensure valid JSON syntax\n\n` +
    `Text:\n${result.response}`

  const retry2 = await callAi(extractPrompt, {
    maxTokens: options.maxTokens ?? 3000,
    temperature: 0,
  })

  try {
    parseResult = parseJson(retry2.response)
    console.log(`[callAiJson] Parse succeeded on repair 2 using strategy: ${parseResult.strategy}`)
    return {
      parsed: parseResult.parsed,
      raw: retry2.response,
      strategy: parseResult.strategy,
      wasRepaired: true,
      repairAttempts: 2,
    }
  } catch (thirdErr) {
    console.warn('[callAiJson] Repair 2 failed:', thirdErr.message)
  }

  // All repair attempts failed — throw comprehensive error
  throw new Error(
    `JSON parsing failed after 2 repair attempts.\n\n` +
    `Original response (${result.response.length} chars):\n` +
    `${result.response.substring(0, 1000)}${result.response.length > 1000 ? '\n[...truncated]' : ''}\n\n` +
    `Repair 1 response (${retry1.response.length} chars):\n` +
    `${retry1.response.substring(0, 500)}${retry1.response.length > 500 ? '\n[...truncated]' : ''}\n\n` +
    `Repair 2 response (${retry2.response.length} chars):\n` +
    `${retry2.response.substring(0, 500)}${retry2.response.length > 500 ? '\n[...truncated]' : ''}`
  )
}

function initSse(res) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()
}

/**
 * The AI frequently renames repeatable-slide keys despite instructions.
 * Correct by position: map returned keys back to the user-defined ones.
 */
function remapInstances(instances, repeatableSlides) {
  if (repeatableSlides.length === 0) return { ...instances }
  const expectedKeys = repeatableSlides.map(rs => rs.key)
  const returnedKeys = Object.keys(instances)
  const result = {}
  expectedKeys.forEach((key, i) => {
    const aiKey = returnedKeys[i] ?? returnedKeys[0]
    result[key] = instances[key] ?? instances[aiKey] ?? 1
  })
  return result
}


/**
 * Derive which zone categories are present given the current repeatable-slide set.
 */
function buildRepSetInfo(zones, repeatableSlides) {
  const repSet    = new Set(repeatableSlides.map(rs => rs.slideIndex))
  const hasBlocks = zones.some(z => !repSet.has(z.slideIndex) && z.autoGenerate !== false && !z.ignored)
  const hasShared = zones.some(z => repSet.has(z.slideIndex) && z.unique === false && z.autoGenerate !== false && !z.ignored)
  return { repSet, hasBlocks, hasShared }
}

/**
 * Parse a customInput string for explicit sheet name directives.
 * Recognises patterns like:
 *   sheet "2026 Estimates"
 *   sheet '2026 Estimates'
 *   only sheet "2026 Estimates"
 *   use only sheet "2026 Estimates"
 *   sheets "Sheet1", "Sheet2"
 *
 * Returns a Set of lowercase sheet names, or null if no directive found.
 */
function parseSheetFilter(customInput) {
  if (!customInput) return null
  // Match: sheet(s) followed by one or more quoted names
  const pattern = /\bsheets?\s+(?:"([^"]+)"|'([^']+)')/gi
  const names = []
  let match
  while ((match = pattern.exec(customInput)) !== null) {
    names.push((match[1] || match[2]).trim().toLowerCase())
  }
  return names.length > 0 ? new Set(names) : null
}

function assembleResults(agentResults) {
  const assembled = {}

  for (const { agent, parsed } of agentResults) {
    if (agent.type === 'blocks') {
      if (parsed.blocks) assembled.blocks = parsed.blocks
      if (parsed.slides) {
        assembled.slides ??= {}
        for (const [k, v] of Object.entries(parsed.slides)) {
          assembled.slides[k] = { ...(assembled.slides[k] ?? {}), ...v }
        }
      }
    } else {
      assembled.slides ??= {}
      const slide = (assembled.slides[agent.slideKey] ??= { instances: [] })
      slide.instances ??= []
      slide.instances[agent.instanceIndex] = parsed
    }
  }

  if (assembled.slides) {
    for (const slideData of Object.values(assembled.slides)) {
      if (slideData.instances) slideData.instances = slideData.instances.filter(Boolean)
    }
  }

  return assembled
}

// ── POST /agentic/plan — orchestration only, SSE stream ───────────────────────

router.post('/agentic/plan', async (req, res) => {
  initSse(res)

  const log   = (msg) => emit(res, 'log',   `${ts()}  ${msg}`)
  const phase = (p)   => emit(res, 'phase', p)
  const error = (msg) => { emit(res, 'error', msg); res.end() }

   try {
     const {
       projectName,
       flowId,
       recipe           = '',
       zones            = [],
       repeatableSlides = [],
       summaryMode      = 'use',
       summaryPrompt    = '',
       contentPrompt    = '',
       customInput      = '',
       selectedFiles    = [],
     } = req.body

     if (!projectName) return error('projectName is required')

     console.log('[agentic/plan] Request body:', JSON.stringify({ projectName, customInput, contentPrompt }, null, 2))

     const projectDir = path.join(RESOLVED_PROJECTS_DIR, projectName)

     // ── Context / summaries ──────────────────────────────────────────────────
       phase('analyzing')

       log(`Custom input received: ${customInput ? `"${customInput.substring(0, 50)}..."` : '(empty)'}`)

    // ── Sheet filter: parse customInput for explicit sheet directives ─────────
    const sheetFilter = parseSheetFilter(customInput || contentPrompt)
    if (sheetFilter) {
      log(`Sheet filter detected: ${[...sheetFilter].join(', ')}`)
    }

    // ── Fast path: no repeatable slides — skip orchestrator entirely ──────────
    if (repeatableSlides.length === 0) {
      log('No repeatable slides — skipping orchestrator, reading full context directly...')
      const fullContext = await readContextFiles(projectDir, { selectedFiles, sheetFilter })

      if (fullContext.fileCount === 0) {
        log('No context files found — proceeding without context')
      } else {
        log(`Context files: ${fullContext.files?.join(', ') || '(none)'}`)
        log(`Full context: ${(fullContext.totalChars / 1000).toFixed(1)}k chars`)
      }

      // Persist full context to disk so /run can re-read it without a browser round-trip
      if (flowId) {
        const flowDir = path.join(RESOLVED_PROJECTS_DIR, projectName, 'flows', flowId)
        try {
          await fsp.mkdir(flowDir, { recursive: true })
          const sliceLines = `${'='.repeat(60)}\nSLICE KEY: blocks\n${'='.repeat(60)}\n${fullContext.text || ''}`
          await Promise.all([
            fsp.writeFile(path.join(flowDir, 'ai-context-blocks.txt'), fullContext.text || '', 'utf8'),
            fsp.writeFile(path.join(flowDir, 'ai-context-slices.txt'), sliceLines, 'utf8'),
          ])
          log(`Saved full context to disk for /run to re-read`)
        } catch (err) {
          console.error(`[agentic/plan] Failed to save context: ${err.message}`)
          log(`Warning: Failed to save context to disk: ${err.message}`)
        }
      }

      const { hasBlocks, hasShared } = buildRepSetInfo(zones, repeatableSlides)
      const agentPlan = []
      if (hasBlocks || hasShared) agentPlan.push({ id: 'blocks', label: 'Blocks & Shared' })

      log(`Plan ready — ${agentPlan.length} agent${agentPlan.length !== 1 ? 's' : ''} queued (no orchestrator)`)

      // contextSlices is intentionally omitted — /run will re-read from disk
      emit(res, 'plan', JSON.stringify({
        instances: {},
        instanceNames: [],
        contextSlices: null,
        rationale: 'No repeatable slides — full context passed directly to blocks agent.',
        agentPlan,
        contextFiles: fullContext.fileCount,
      }))
      return res.end()
    }

    // ── Orchestrator path: repeatable slides present ──────────────────────────
    log('Reading AI Context files (compact schema for orchestrator)...')
    const compactContext = await readContextFilesCompact(projectDir, { selectedFiles, sheetFilter })

    if (compactContext.fileCount === 0) {
      log('No context files found — proceeding without context')
    } else {
      log(`Context files: ${compactContext.files?.join(', ') || '(none)'}`)
      log(`Compact schema: ${(compactContext.totalChars / 1000).toFixed(1)}k chars`)
    }

     // ── Orchestrator ─────────────────────────────────────────────────────────
     phase('planning')
     log('Orchestrator: identifying grouping from schema...')

     const promptToUse = customInput || contentPrompt
     console.log('[agentic/plan] Building orchestrator prompt with:', { customInput: customInput?.substring(0, 50), contentPrompt: contentPrompt?.substring(0, 50), promptToUse: promptToUse?.substring(0, 50) })
     const orchestratorPrompt = buildOrchestratorPrompt(recipe, compactContext.text, promptToUse, repeatableSlides)
     log(`Orchestrator prompt: ${orchestratorPrompt.length} chars`)

      let orchResult
     try {
       const orchAi = await callAiJson(orchestratorPrompt, { maxTokens: 1000, temperature: 0.1 })
       const repairInfo = orchAi.wasRepaired ? ` [repaired in ${orchAi.repairAttempts} attempt(s), strategy: ${orchAi.strategy}]` : ` [strategy: ${orchAi.strategy}]`
       log(`Orchestrator response received (${orchAi.raw.length} chars)${repairInfo}`)
       console.log(`[agentic/plan] Orchestrator raw response:\n${orchAi.raw}`)
       console.log(`[agentic/plan] Parse strategy: ${orchAi.strategy}, repairs: ${orchAi.repairAttempts}`)
       orchResult = orchAi.parsed
       console.log('[agentic/plan] Orchestrator parsed OK:', JSON.stringify(orchResult, null, 2))
     } catch (parseErr) {
       console.error(`[agentic/plan] Orchestrator JSON parse FAILED after all repair attempts:\n${parseErr.message}`)
       return error(`Orchestrator returned invalid JSON.\n${parseErr.message}`)
     }

      const { instances: rawInstances = {}, instanceNames = [], rationale = '', grouping = null } = orchResult
      const remappedInstances = remapInstances(rawInstances, repeatableSlides)

      console.log('[agentic/plan] instances:', JSON.stringify(rawInstances))
      console.log('[agentic/plan] grouping:', JSON.stringify(grouping))

    // ── Build contextSlices from real data (code-based, no AI) ───────────────
    log('Extracting context slices from source files...')
    const contextDir = path.join(projectDir, 'AI Context')
    let contextSlices = {}

    if (grouping?.column && grouping?.values?.length > 0) {
      log(`Grouping by column "${grouping.column}" — ${grouping.values.length} group(s)`)
      const { slices, blocksText, matched } = await extractGroupedSlices(
        contextDir, grouping.column, grouping.values, compactContext.files
      )
      if (matched) {
        contextSlices = { ...slices }
        if (blocksText) contextSlices['blocks'] = blocksText
        log(`Slices built: ${Object.keys(slices).length} instance slice(s)${blocksText ? ' + blocks' : ''}`)
      } else {
        log(`Warning: column "${grouping.column}" not found in any file — falling back to full context`)
        const fullContext = await readContextFiles(projectDir, { selectedFiles, sheetFilter })
        if (fullContext.text) contextSlices['blocks'] = fullContext.text
        log(`Fallback: loaded full context (${fullContext.text?.length ?? 0} chars) into blocks slice`)
      }
    } else {
      log('Orchestrator returned null grouping — reading full context for blocks agent...')
      const fullContext = await readContextFiles(projectDir, { selectedFiles, sheetFilter })
      if (fullContext.text) contextSlices['blocks'] = fullContext.text
      log(`Full context loaded: ${fullContext.text?.length ?? 0} chars`)
    }

    // Save orchestrator prompt and context slices for debugging
    if (flowId) {
      const flowDir = path.join(RESOLVED_PROJECTS_DIR, projectName, 'flows', flowId)
      try {
        await fsp.mkdir(flowDir, { recursive: true })
        const sliceLines = Object.entries(contextSlices).map(([key, text]) =>
          `${'='.repeat(60)}\nSLICE KEY: ${key}\n${'='.repeat(60)}\n${text}`
        ).join('\n\n')
        await Promise.all([
          fsp.writeFile(path.join(flowDir, 'ai-orchestrator-prompt.txt'), orchestratorPrompt, 'utf8'),
          fsp.writeFile(path.join(flowDir, 'ai-context-slices.txt'), sliceLines, 'utf8'),
        ])
        log(`Saved orchestrator prompt and ${Object.keys(contextSlices).length} context slice(s) to disk`)
      } catch (err) {
        console.error(`[agentic/plan] Failed to save slices: ${err.message}`)
        log(`Warning: Failed to save slices to disk: ${err.message}`)
      }
    }

     log(`Instances: ${JSON.stringify(remappedInstances)}`)
     log(`Context slices: ${Object.keys(contextSlices).length} key(s) — ${Object.keys(contextSlices).join(', ') || '(none)'}`)
     log(`Instance names: ${instanceNames.join(', ') || '(none)'}`)
     if (rationale) log(`Orchestrator: ${rationale}`)
    for (const [key, n] of Object.entries(remappedInstances)) {
      log(`  ${key}: ${n} instance${n !== 1 ? 's' : ''}`)
    }

    // ── Derive agent plan for confirmation card ───────────────────────────────
    const { hasBlocks, hasShared } = buildRepSetInfo(zones, repeatableSlides)
    const agentPlan = []
    if (hasBlocks || hasShared) agentPlan.push({ id: 'blocks', label: 'Blocks & Shared' })

    let nameIdx = 0
    for (const [slideKey, count] of Object.entries(remappedInstances)) {
      for (let i = 0; i < count; i++) {
        const name = instanceNames[nameIdx] || `${slideKey} — instance ${i + 1}`
        agentPlan.push({ id: `${slideKey}_${i}`, label: name })
        nameIdx++
      }
    }

    log(`Plan ready — ${agentPlan.length} agent${agentPlan.length !== 1 ? 's' : ''} queued`)

      emit(res, 'plan', JSON.stringify({
        instances: remappedInstances,
        instanceNames,
        contextSlices,
        rationale,
        agentPlan,
        contextFiles: compactContext.fileCount,
      }))
    res.end()

  } catch (err) {
    console.error('[agentic/plan] FATAL:', err.stack || err.message)
    error(err.message)
  }
})

// ── POST /agentic/run — parallel generation, SSE stream ───────────────────────

router.post('/agentic/run', async (req, res) => {
  initSse(res)

  const log   = (msg)  => emit(res, 'log',   `${ts()}  ${msg}`)
  const phase = (p)    => emit(res, 'phase',  p)
  const done  = (json) => emit(res, 'done',   json)
  const error = (msg)  => { emit(res, 'error', msg); res.end() }

   try {
       const {
         projectName,
         flowId,
         zones            = [],
         repeatableSlides = [],
         instances        = {},
         contextSlices    = {},
         contentPrompt    = '',
         customInput      = '',
       } = req.body

    if (!projectName) return error('projectName is required')

    const remappedInstances = remapInstances(instances, repeatableSlides)
    const { repSet, hasBlocks, hasShared } = buildRepSetInfo(zones, repeatableSlides)

    // ── Resolve context slices ────────────────────────────────────────────────
    // When contextSlices is null the /plan fast-path was used (no repeatable slides).
    // Re-read the persisted blocks context from disk instead of relying on the
    // browser round-trip, which avoids sending large payloads through the client.
    let resolvedSlices = contextSlices
    if (!contextSlices || Object.keys(contextSlices).length === 0) {
      if (flowId) {
        const blocksFile = path.join(RESOLVED_PROJECTS_DIR, projectName, 'flows', flowId, 'ai-context-blocks.txt')
        try {
          const blocksText = await fsp.readFile(blocksFile, 'utf8')
          resolvedSlices = { blocks: blocksText }
          log(`Re-read blocks context from disk: ${blocksText.length} chars`)
        } catch {
          log('Warning: no ai-context-blocks.txt found — context will be empty')
          resolvedSlices = {}
        }
      } else {
        resolvedSlices = {}
      }
    }

    // ── Build agent list ──────────────────────────────────────────────────────
    const agents = []
    if (hasBlocks || hasShared) {
      agents.push({ id: 'blocks', type: 'blocks', label: 'Blocks & Shared' })
    }
    let globalIdx = 0
    for (const [slideKey, count] of Object.entries(remappedInstances)) {
      for (let i = 0; i < count; i++) {
        agents.push({ id: `${slideKey}_${i}`, type: 'instance', slideKey, instanceIndex: i, instanceCount: count, globalIndex: globalIdx, label: `${slideKey} — #${i + 1}` })
        globalIdx++
      }
    }

    if (agents.length === 0) return error('Nothing to generate — no block zones and no instances')

    emit(res, 'agents', agents.map(a => ({ id: a.id, label: a.label, state: 'pending' })))
    phase('generating')
    log(`Starting ${agents.length} parallel agent${agents.length !== 1 ? 's' : ''}...`)
    console.log(`[agentic/run] Agents: ${agents.map(a => a.label).join(', ')}`)
    console.log(`[agentic/run] Context slice keys: ${Object.keys(resolvedSlices).join(', ') || '(none)'}`)
    console.log(`[agentic/run] Zones: ${zones.length}, RepeatableSlides: ${repeatableSlides.length}`)

      // ── Parallel generation ───────────────────────────────────────────────────
      const agentResults = await Promise.all(agents.map(async (agent) => {
        emit(res, 'agent_update', { id: agent.id, state: 'running' })
        const t0 = Date.now()

        let agentContext = ''

        if (agent.type === 'blocks') {
          agentContext = resolvedSlices['blocks'] || ''
        } else {
          agentContext = resolvedSlices[agent.globalIndex.toString()] || ''
        }

         console.log(`[agentic/run][${agent.label}] Context slice length: ${agentContext.length} chars`)
         if (agentContext.length > 1_000_000) {
           console.warn(`[agentic/run][${agent.label}] WARNING: Context exceeds 1M chars (${(agentContext.length / 1_000_000).toFixed(1)}M) — will be capped by prompt builder`)
         }
         console.log(`[agentic/run][${agent.label}] Context preview: ${agentContext.slice(0, 200)}`)

         const prompt = agent.type === 'blocks'
           ? buildBlocksPrompt(zones, repeatableSlides, agentContext, repSet, customInput || contentPrompt)
           : buildInstancePrompt(zones, repeatableSlides, agent.slideKey, agent.instanceIndex, agent.instanceCount, agentContext, customInput || contentPrompt)

         console.log(`[agentic/run][${agent.label}] Prompt length: ${prompt.length} chars`)
         if (prompt.length > 2_000_000) {
           console.warn(`[agentic/run][${agent.label}] WARNING: Prompt exceeds 2M chars (${(prompt.length / 1_000_000).toFixed(1)}M) — may fail API limits`)
         }
         console.log(`[agentic/run][${agent.label}] Prompt preview (first 500):\n${prompt.slice(0, 500)}`)

       log(`[${agent.label}] Sending prompt (${prompt.length} chars)...`)
       let parsed
       try {
         const agentAi = await callAiJson(prompt, { maxTokens: 3000, temperature: 0.4 })
         const repairInfo = agentAi.wasRepaired ? ` [repaired in ${agentAi.repairAttempts} attempt(s), strategy: ${agentAi.strategy}]` : ` [strategy: ${agentAi.strategy}]`
         log(`[${agent.label}] Response received (${agentAi.raw.length} chars)${repairInfo}`)
         console.log(`[agentic/run][${agent.label}] Raw response (${agentAi.raw.length} chars):\n${agentAi.raw}`)
         console.log(`[agentic/run][${agent.label}] Parse strategy: ${agentAi.strategy}, repairs: ${agentAi.repairAttempts}`)
         parsed = agentAi.parsed
       } catch (parseErr) {
         emit(res, 'agent_update', { id: agent.id, state: 'error' })
         console.error(`[agentic/run][${agent.label}] JSON parse FAILED after all repair attempts:\n${parseErr.message}`)
         log(`[${agent.label}] PARSE ERROR (exhausted all repair strategies)`)
         log(`[${agent.label}] Error details: ${parseErr.message.split('\n')[0]}`)
         throw new Error(`Agent "${agent.label}" returned invalid JSON.\n${parseErr.message}`)
       }

       log(`[${agent.label}] Parsed OK — ${Object.keys(parsed).length} top-level keys`)
       console.log(`[agentic/run][${agent.label}] Parsed top-level keys: ${Object.keys(parsed).join(', ')}`)
       emit(res, 'agent_update', { id: agent.id, state: 'done' })
       log(`${agent.label} done (${((Date.now() - t0) / 1000).toFixed(1)}s)`)

      return { agent, parsed, prompt }
    }))

    // Save agent prompts for debugging
    if (flowId) {
      const flowDir = path.join(RESOLVED_PROJECTS_DIR, projectName, 'flows', flowId)
      try {
        await fsp.mkdir(flowDir, { recursive: true })
        const content = agentResults.map((r, i) => `=== Agent ${i + 1}: ${r.agent.label} ===\n${r.prompt}`).join('\n\n')
        await fsp.writeFile(path.join(flowDir, 'ai-agent-prompts.txt'), content, 'utf8')
        log(`Saved ${agentResults.length} agent prompt(s) to disk`)
      } catch (err) {
        console.error(`[agentic/run] Failed to save agent prompts: ${err.message}`)
        log(`Warning: Failed to save agent prompts: ${err.message}`)
      }
    }

    // ── Assembly ──────────────────────────────────────────────────────────────
    phase('assembling')
    log('Assembling final JSON...')

    const assembled  = assembleResults(agentResults)
    const jsonString = JSON.stringify(assembled)
    log(`Assembled JSON: ${jsonString.length} chars`)

    const vResult = validateHtmlJson(jsonString, zones, repeatableSlides)
    if (vResult.missingFields?.length > 0) {
      log(`Warning: ${vResult.missingFields.length} missing field(s):`)
      vResult.missingFields.forEach(field => log(`  Missing: ${field}`))
    } else {
      log(`All fields populated (${vResult.foundFields?.length ?? 0} fields)`)
    }

    log('Done.')
    done(jsonString)
    res.end()

  } catch (err) {
    log(`FATAL ERROR: ${err.stack || err.message}`)
    error(err.message)
  }
})

export default router
