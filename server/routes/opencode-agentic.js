/**
 * server/routes/opencode-agentic.js
 *
 * POST /api/opencode/agentic
 *
 * Streams Server-Sent Events while running parallel AI agents via the same
 * Cortex API used by ai-proxy (callAi from ai-client.js). No OpenCode SDK.
 *
 * Pipeline:
 *   1. Read AI Context files
 *   2. Orchestrator call  → instance counts + compact context summary
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
import path    from 'path'
import { callAi }           from '../lib/ai-client.js'
import { readContextFiles } from '../lib/context-reader.js'
import { validateHtmlJson } from '../lib/html-recipe-builder.js'
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
  // Strip markdown code fences if the model wraps its output
  const cleaned = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  return JSON.parse(cleaned)
}

// ── Prompt builders ────────────────────────────────────────────────────────────

function buildOrchestratorPrompt(recipe, contextText) {
  const contextBlock = contextText
    ? `CONTEXT FILES:\n${contextText}`
    : 'CONTEXT: (no context files provided)'

  return `You are an orchestrator for a presentation slide generation system.

${contextBlock}

RECIPE (the template that must be filled):
${recipe}

Your tasks:
1. Read the context to determine how many instances to generate for each REPEATABLE SLIDE in the recipe. Base the count on actual data items (e.g. one instance per product, person, project listed in the context).
2. Write a COMPACT CONTEXT SUMMARY (max 350 words) capturing all key data points that content-generating agents will need. This will be the ONLY context those agents receive — make it dense and complete.

Return ONLY valid JSON (no markdown, no explanation):
{
  "instances": { "<slideKey>": <number> },
  "contextSummary": "<concise structured summary of all data points>",
  "rationale": "<one sentence explaining instance count decision>"
}

If there are no repeatable slides, use: "instances": {}`
}

function buildBlocksPrompt(zones, repeatableSlides, contextSummary, repSet) {
  const repBySlide = new Map(repeatableSlides.map(rs => [rs.slideIndex, rs]))

  const blockZones = zones.filter(
    z => !repSet.has(z.slideIndex) && z.autoGenerate !== false && !z.ignored
  )
  const sharedZones = zones.filter(
    z => repSet.has(z.slideIndex) && z.unique === false && z.autoGenerate !== false && !z.ignored
  )

  let prompt = `You generate static slide content for a presentation template.

CONTEXT:
${contextSummary || 'No context provided.'}

Return ONLY valid JSON:
{
  "blocks": { "<key>": { "value": "<innerHTML>" } },
  "slides": { "<slideKey>": { "shared": { "<key>": "<innerHTML>" } } }
}
Omit a section entirely if it has no zones.

ZONES TO FILL:\n`

  if (blockZones.length > 0) {
    prompt += '\n[BLOCK ZONES — static, one value each]\n'
    blockZones.forEach(z => {
      prompt += `• "${z.key}"${z.prompt ? ` — ${z.prompt}` : ''}\n`
      if (z.exampleHtml) {
        prompt += `  Layout: ${z.exampleHtml.slice(0, 350).replace(/\n/g, ' ')}\n`
      }
    })
  }

  if (sharedZones.length > 0) {
    const bySlide = {}
    sharedZones.forEach(z => {
      const slideKey = repBySlide.get(z.slideIndex)?.key ?? `slide_${z.slideIndex}`
      ;(bySlide[slideKey] ??= []).push(z)
    })
    prompt += '\n[SHARED ZONES — same on every slide clone]\n'
    for (const [slideKey, slideZones] of Object.entries(bySlide)) {
      prompt += `Slide "${slideKey}":\n`
      slideZones.forEach(z => {
        prompt += `• "${z.key}"${z.prompt ? ` — ${z.prompt}` : ''}\n`
        if (z.exampleHtml) {
          prompt += `  Layout: ${z.exampleHtml.slice(0, 350).replace(/\n/g, ' ')}\n`
        }
      })
    }
  }

  prompt += '\nRules: innerHTML only, no wrapping tags, preserve class names from layout references.'
  return prompt
}

function buildInstancePrompt(zones, repeatableSlides, slideKey, instanceIndex, instanceCount, contextSummary) {
  const rsConfig = repeatableSlides.find(rs => rs.key === slideKey)
  const slideIdx = rsConfig?.slideIndex

  const uniqueZones = zones.filter(
    z => z.slideIndex === slideIdx && z.unique !== false && z.autoGenerate !== false && !z.ignored
  )

  let prompt =
    `You generate content for one slide instance in a presentation.

CONTEXT:
${contextSummary || 'No context provided.'}

Task: generate instance ${instanceIndex + 1} of ${instanceCount}. Each instance represents a distinct data item — use item number ${instanceIndex + 1} from the context.${rsConfig?.prompt ? `\nSlide guidance: ${rsConfig.prompt}` : ''}

Return ONLY a JSON object with EXACTLY these keys (innerHTML values):
{
`
  uniqueZones.forEach(z => { prompt += `  "${z.key}": "<innerHTML>",\n` })
  prompt += `}

Zone descriptions:\n`
  uniqueZones.forEach(z => {
    prompt += `• "${z.key}"${z.prompt ? `: ${z.prompt}` : ''}\n`
    if (z.exampleHtml) {
      prompt += `  Layout: ${z.exampleHtml.slice(0, 400).replace(/\n/g, ' ')}\n`
    }
  })

  prompt += `\nRules: innerHTML only, no wrapping tags, preserve class names. Use data specific to item ${instanceIndex + 1}.`
  return prompt
}

// ── Result assembler ───────────────────────────────────────────────────────────

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

// ── Route ──────────────────────────────────────────────────────────────────────

router.post('/agentic', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const log   = (msg)  => emit(res, 'log',          `${ts()}  ${msg}`)
  const phase = (p)    => emit(res, 'phase',         p)
  const done  = (json) => emit(res, 'done',          json)
  const error = (msg)  => { emit(res, 'error', msg); res.end() }

  try {
    const { projectName, recipe = '', zones = [], repeatableSlides = [] } = req.body

    if (!projectName) return error('projectName is required')
    if (!recipe.trim()) return error('No recipe provided — generate the recipe first')

    // ── Phase 1: Context ───────────────────────────────────────────────────
    phase('analyzing')
    log('Reading AI Context files...')

    const projectDir = path.join(RESOLVED_PROJECTS_DIR, projectName)
    const context    = await readContextFiles(projectDir)

    if (context.fileCount === 0) {
      log('No context files found — proceeding without context')
    } else {
      const kb = (context.totalChars / 1000).toFixed(1)
      log(`Found ${context.fileCount} file${context.fileCount !== 1 ? 's' : ''} (${kb}k chars)`)
    }

    // ── Phase 2: Orchestration ─────────────────────────────────────────────
    phase('planning')
    log('Orchestrator: analysing recipe + context...')

    const orchRaw = await callAi(buildOrchestratorPrompt(recipe, context.text), {
      maxTokens: 2000,
      temperature: 0.3,
    })

    let orchResult
    try {
      orchResult = parseJson(orchRaw.response)
    } catch {
      return error(`Orchestrator returned invalid JSON.\nRaw: ${orchRaw.response.slice(0, 300)}`)
    }

    const { instances = {}, contextSummary = '', rationale = '' } = orchResult

    if (rationale) log(`Orchestrator: ${rationale}`)
    for (const [key, n] of Object.entries(instances)) {
      log(`  ${key}: ${n} instance${n !== 1 ? 's' : ''}`)
    }

    // ── Phase 3: Build agent plan ──────────────────────────────────────────
    const repSet = new Set(repeatableSlides.map(rs => rs.slideIndex))

    const hasBlocks = zones.some(z => !repSet.has(z.slideIndex) && z.autoGenerate !== false && !z.ignored)
    const hasShared = zones.some(z => repSet.has(z.slideIndex) && z.unique === false && z.autoGenerate !== false && !z.ignored)

    const agents = []

    if (hasBlocks || hasShared) {
      agents.push({ id: 'blocks', type: 'blocks', label: 'Blocks & Shared' })
    }

    for (const [slideKey, count] of Object.entries(instances)) {
      for (let i = 0; i < count; i++) {
        agents.push({
          id:            `${slideKey}_${i}`,
          type:          'instance',
          slideKey,
          instanceIndex: i,
          instanceCount: count,
          label:         `${slideKey} — #${i + 1}`,
        })
      }
    }

    if (agents.length === 0) return error('Nothing to generate — no block zones and no instances')

    emit(res, 'agents', agents.map(a => ({ id: a.id, label: a.label, state: 'pending' })))
    phase('generating')
    log(`Starting ${agents.length} parallel agent${agents.length !== 1 ? 's' : ''}...`)

    // ── Phase 4: Parallel generation ───────────────────────────────────────
    const agentResults = await Promise.all(agents.map(async (agent) => {
      emit(res, 'agent_update', { id: agent.id, state: 'running' })
      const t0 = Date.now()

      const prompt = agent.type === 'blocks'
        ? buildBlocksPrompt(zones, repeatableSlides, contextSummary, repSet)
        : buildInstancePrompt(zones, repeatableSlides, agent.slideKey, agent.instanceIndex, agent.instanceCount, contextSummary)

      const result = await callAi(prompt, { maxTokens: 3000, temperature: 0.4 })

      let parsed
      try {
        parsed = parseJson(result.response)
      } catch {
        emit(res, 'agent_update', { id: agent.id, state: 'error' })
        throw new Error(`Agent "${agent.label}" returned invalid JSON: ${result.response.slice(0, 120)}`)
      }

      const secs = ((Date.now() - t0) / 1000).toFixed(1)
      emit(res, 'agent_update', { id: agent.id, state: 'done' })
      log(`${agent.label} done (${secs}s)`)

      return { agent, parsed }
    }))

    // ── Phase 5: Assembly ──────────────────────────────────────────────────
    phase('assembling')
    log('Assembling final JSON...')

    const assembled  = assembleResults(agentResults)
    // Compact JSON for SSE transport (no newlines = single data: line)
    const jsonString = JSON.stringify(assembled)

    const vResult = validateHtmlJson(jsonString, zones, repeatableSlides)
    if (vResult.missingFields?.length > 0) {
      const preview = vResult.missingFields.slice(0, 3).join(', ')
      log(`Warning: ${vResult.missingFields.length} missing field(s) — ${preview}`)
    } else {
      log(`All fields populated (${vResult.foundFields?.length ?? 0} fields)`)
    }

    log('Done.')
    done(jsonString)
    res.end()

  } catch (err) {
    error(err.message)
  }
})

export default router
