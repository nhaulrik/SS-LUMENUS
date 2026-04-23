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
import fs      from 'fs'
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

function parseJson(text) {
  // 1. Try to extract JSON from a fenced code block (```json ... ```)
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    return JSON.parse(fenceMatch[1].trim())
  }
  // 2. Try to extract the first {...} or [...] object from anywhere in the text
  //    (handles models that prepend reasoning prose before bare JSON)
  const objMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (objMatch) {
    return JSON.parse(objMatch[1])
  }
  // 3. Last resort: parse the whole trimmed text
  return JSON.parse(text.trim())
}

/**
 * Call the AI and parse the response as JSON.
 * If parsing fails, retry once with a repair prompt asking the model to
 * return only the JSON it already produced — no prose, no fences.
 */
async function callAiJson(prompt, options = {}) {
  const result = await callAi(prompt, options)
  try {
    return { parsed: parseJson(result.response), raw: result.response }
  } catch (firstErr) {
    // Retry: send the bad response back and ask for JSON only
    console.warn('[callAiJson] First parse failed, retrying with repair prompt:', firstErr.message)
    const repairPrompt =
      `The following text contains a JSON object but also includes extra prose or markdown that makes it unparseable.\n` +
      `Extract and return ONLY the raw JSON object — no explanation, no markdown fences, no commentary.\n` +
      `Start your response with { and end it with }.\n\n` +
      `TEXT TO REPAIR:\n${result.response}`
    const retry = await callAi(repairPrompt, { maxTokens: options.maxTokens ?? 3000, temperature: 0 })
    try {
      return { parsed: parseJson(retry.response), raw: retry.response, wasRepaired: true }
    } catch (secondErr) {
      throw new Error(
        `JSON parse failed after repair attempt.\n` +
        `Original error: ${firstErr.message}\n` +
        `Repair error: ${secondErr.message}\n\n` +
        `Original response:\n${result.response}`
      )
    }
  }
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
       log('Reading AI Context files (compact schema)...')
     const compactContext = await readContextFilesCompact(projectDir, { selectedFiles })

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
      log(`Orchestrator response received (${orchAi.raw.length} chars)${orchAi.wasRepaired ? ' [repaired]' : ''}`)
      console.log(`[agentic/plan] Orchestrator raw response:\n${orchAi.raw}`)
      orchResult = orchAi.parsed
      console.log('[agentic/plan] Orchestrator parsed OK:', JSON.stringify(orchResult, null, 2))
    } catch (parseErr) {
      console.error(`[agentic/plan] Orchestrator JSON parse FAILED: ${parseErr.message}`)
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
        const fullContext = await readContextFiles(projectDir, { selectedFiles })
        if (fullContext.text) contextSlices['blocks'] = fullContext.text
        log(`Fallback: loaded full context (${fullContext.text?.length ?? 0} chars) into blocks slice`)
      }
    } else if (grouping === null || repeatableSlides.length === 0) {
      // No repeatable slides, or orchestrator explicitly returned null grouping
      // — read full context for the blocks agent
      log('No grouping or no repeatable slides — reading full context for blocks agent...')
      const fullContext = await readContextFiles(projectDir, { selectedFiles })
      if (fullContext.text) contextSlices['blocks'] = fullContext.text
      log(`Full context loaded: ${fullContext.text?.length ?? 0} chars`)
    } else {
      log('Warning: orchestrator did not return a usable grouping spec — falling back to full context')
      const fullContext = await readContextFiles(projectDir, { selectedFiles })
      if (fullContext.text) contextSlices['blocks'] = fullContext.text
      log(`Fallback: loaded full context (${fullContext.text?.length ?? 0} chars) into blocks slice`)
    }

    // Save orchestrator prompt and context slices for debugging
    if (flowId) {
      const flowDir = path.join(RESOLVED_PROJECTS_DIR, projectName, 'flows', flowId)
      if (fs.existsSync(flowDir)) {
        fs.writeFileSync(path.join(flowDir, 'ai-orchestrator-prompt.txt'), orchestratorPrompt, 'utf8')
        const sliceLines = Object.entries(contextSlices).map(([key, text]) =>
          `${'='.repeat(60)}\nSLICE KEY: ${key}\n${'='.repeat(60)}\n${text}`
        ).join('\n\n')
        fs.writeFileSync(path.join(flowDir, 'ai-context-slices.txt'), sliceLines, 'utf8')
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
    console.log(`[agentic/run] Context slice keys: ${Object.keys(contextSlices).join(', ') || '(none)'}`)
    console.log(`[agentic/run] Zones: ${zones.length}, RepeatableSlides: ${repeatableSlides.length}`)

      // ── Parallel generation ───────────────────────────────────────────────────
      const agentResults = await Promise.all(agents.map(async (agent) => {
        emit(res, 'agent_update', { id: agent.id, state: 'running' })
        const t0 = Date.now()

        let agentContext = ''

        if (agent.type === 'blocks') {
          agentContext = contextSlices['blocks'] || ''
        } else {
          agentContext = contextSlices[agent.globalIndex.toString()] || ''
        }

        console.log(`[agentic/run][${agent.label}] Context slice length: ${agentContext.length} chars`)
        console.log(`[agentic/run][${agent.label}] Context preview: ${agentContext.slice(0, 200)}`)

        const prompt = agent.type === 'blocks'
          ? buildBlocksPrompt(zones, repeatableSlides, agentContext, repSet, customInput || contentPrompt)
          : buildInstancePrompt(zones, repeatableSlides, agent.slideKey, agent.instanceIndex, agent.instanceCount, agentContext, customInput || contentPrompt)

        console.log(`[agentic/run][${agent.label}] Prompt length: ${prompt.length} chars`)
        console.log(`[agentic/run][${agent.label}] Prompt preview (first 500):\n${prompt.slice(0, 500)}`)

       log(`[${agent.label}] Sending prompt (${prompt.length} chars)...`)
      let parsed
      try {
        const agentAi = await callAiJson(prompt, { maxTokens: 3000, temperature: 0.4 })
        log(`[${agent.label}] Response received (${agentAi.raw.length} chars)${agentAi.wasRepaired ? ' [repaired]' : ''}`)
        console.log(`[agentic/run][${agent.label}] Raw response (${agentAi.raw.length} chars):\n${agentAi.raw}`)
        parsed = agentAi.parsed
      } catch (parseErr) {
        emit(res, 'agent_update', { id: agent.id, state: 'error' })
        console.error(`[agentic/run][${agent.label}] JSON parse FAILED after repair: ${parseErr.message}`)
        log(`[${agent.label}] PARSE ERROR (after repair attempt): ${parseErr.message}`)
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
      if (fs.existsSync(flowDir)) {
        const content = agentResults.map((r, i) => `=== Agent ${i + 1}: ${r.agent.label} ===\n${r.prompt}`).join('\n\n')
        fs.writeFileSync(path.join(flowDir, 'ai-agent-prompts.txt'), content, 'utf8')
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
