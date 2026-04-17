/**
 * AgenticPanel.jsx
 *
 * Streams agentic JSON generation via SSE (POST + fetch streaming).
 * On completion, calls onJsonReady(jsonString) to auto-fill the JSON
 * Response field in HtmlRecipeStep.
 *
 * Props:
 *   projectName     string
 *   recipe          string   — current recipe text (from HtmlRecipeStep)
 *   zones           Array
 *   repeatableSlides Array
 *   onJsonReady     (jsonString) => void
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import css from './AgenticPanel.module.css'

// ── SSE reader (works with POST) ───────────────────────────────────────────────

async function* readSSE(response) {
  const reader  = response.body.getReader()
  const decoder = new TextDecoder()
  let   buffer  = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() // keep trailing incomplete block

    for (const block of blocks) {
      if (!block.trim()) continue
      let eventType = 'message'
      let eventData = ''
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) eventType = line.slice(7).trim()
        // SSE spec: multiple data lines are concatenated with \n
        if (line.startsWith('data: ')) eventData += (eventData ? '\n' : '') + line.slice(6)
      }
      if (eventData !== '') yield { type: eventType, data: eventData }
    }
  }
}

// ── Phase config ───────────────────────────────────────────────────────────────

const PHASES = [
  { id: 'analyzing',  label: 'Analysing'  },
  { id: 'planning',   label: 'Planning'   },
  { id: 'generating', label: 'Generating' },
  { id: 'assembling', label: 'Assembling' },
]

function phaseIndex(id) {
  return PHASES.findIndex(p => p.id === id)
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AgenticPanel({ projectName, recipe, zones, repeatableSlides, onJsonReady }) {
  const [status,    setStatus]    = useState('idle')   // idle | running | done | error
  const [phase,     setPhase]     = useState('')
  const [logs,      setLogs]      = useState([])
  const [agents,    setAgents]    = useState([])        // [{ id, label, state }]
  const [errorMsg,  setErrorMsg]  = useState('')
  const [elapsed,   setElapsed]   = useState(0)

  const logEndRef   = useRef(null)
  const timerRef    = useRef(null)
  const abortRef    = useRef(null)

  const hasRecipe = recipe && recipe.trim().length > 0

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [logs])

  // Elapsed timer
  useEffect(() => {
    if (status === 'running') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [status])

  const appendLog = (msg) => setLogs(prev => [...prev, msg])

  const updateAgent = (id, state) =>
    setAgents(prev => prev.map(a => a.id === id ? { ...a, state } : a))

  const handleGenerate = useCallback(async () => {
    if (!hasRecipe || status === 'running') return

    // Reset
    setStatus('running')
    setPhase('')
    setLogs([])
    setAgents([])
    setErrorMsg('')
    setElapsed(0)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/opencode/agentic', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ projectName, recipe, zones, repeatableSlides }),
        signal:  controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Server error ${response.status}`)
      }

      for await (const { type, data } of readSSE(response)) {
        switch (type) {
          case 'phase':
            setPhase(data)
            break

          case 'log':
            appendLog(data)
            break

          case 'agents':
            setAgents(JSON.parse(data))
            break

          case 'agent_update': {
            const { id, state } = JSON.parse(data)
            updateAgent(id, state)
            break
          }

          case 'done':
            setStatus('done')
            onJsonReady?.(data)
            break

          case 'error':
            setStatus('error')
            setErrorMsg(data)
            break
        }
      }

    } catch (err) {
      if (err.name !== 'AbortError') {
        setStatus('error')
        setErrorMsg(err.message)
      }
    }
  }, [hasRecipe, status, projectName, recipe, zones, repeatableSlides, onJsonReady])

  const handleReset = () => {
    abortRef.current?.abort()
    setStatus('idle')
    setPhase('')
    setLogs([])
    setAgents([])
    setErrorMsg('')
    setElapsed(0)
  }

  const currentPhaseIdx = phaseIndex(phase)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <section className={css.panel}>
      <div className={css.header}>
        <h3 className={css.title}>
          Agentic Generation
          <span className={css.titleBadge}>Beta</span>
        </h3>
      </div>

      <p className={css.description}>
        Let AI generate the JSON response automatically. The AI reads your context files,
        decides how many instances to create, then runs parallel agents — one per slide instance.
        The result is pasted directly into the JSON Response field above.
      </p>

      {/* Trigger row */}
      <div className={css.triggerRow}>
        <button
          className={`${css.generateBtn} ${status === 'running' ? css.running : ''}`}
          onClick={status === 'running' ? undefined : handleGenerate}
          disabled={!hasRecipe || status === 'running'}
        >
          {status === 'running' ? 'Generating…' : '✦ Generate with AI'}
        </button>

        {status === 'running' && (
          <span className={css.timer}>{elapsed}s</span>
        )}

        {!hasRecipe && status === 'idle' && (
          <span className={css.noRecipeHint}>Generate the recipe first ↑</span>
        )}
      </div>

      {/* Phase stepper — visible once running */}
      {(status === 'running' || status === 'done') && (
        <div className={css.stepper}>
          {PHASES.map((p, i) => {
            const isDone   = currentPhaseIdx > i || status === 'done'
            const isActive = currentPhaseIdx === i && status === 'running'
            return (
              <div key={p.id} className={css.stepItem}>
                <div className={`${css.stepDot} ${isDone ? css.done : ''} ${isActive ? css.active : ''}`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span className={`${css.stepLabel} ${isDone ? css.done : ''} ${isActive ? css.active : ''}`}>
                  {p.label}
                </span>
                {i < PHASES.length - 1 && (
                  <div className={`${css.stepConnector} ${isDone ? css.done : ''}`} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Instance chips */}
      {agents.length > 0 && (
        <div className={css.chipsSection}>
          <div className={css.chipsLabel}>Agents</div>
          <div className={css.chips}>
            {agents.map(agent => (
              <div key={agent.id} className={`${css.chip} ${css[agent.state]}`}>
                {agent.state === 'running' && <div className={css.chipSpinner} />}
                {agent.state === 'done'    && '✓'}
                {agent.state === 'error'   && '✕'}
                {agent.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity log */}
      {logs.length > 0 && (
        <div className={css.logSection}>
          <div className={css.logLabel}>Activity</div>
          <div className={css.log}>
            {logs.map((line, i) => (
              <span
                key={i}
                className={`${css.logLine} ${i === logs.length - 1 ? css.latest : ''}`}
              >
                {line}{'\n'}
              </span>
            ))}
            <span ref={logEndRef} />
          </div>
        </div>
      )}

      {/* Success banner */}
      {status === 'done' && (
        <div className={css.successBanner}>
          <span>✓</span>
          <span>JSON generated and pasted into the Response field. Review and apply when ready.</span>
        </div>
      )}

      {/* Error banner */}
      {status === 'error' && (
        <div className={css.errorBanner}>
          <strong>Generation failed</strong>
          {errorMsg}
          <div>
            <button className={css.resetBtn} onClick={handleReset}>Try again</button>
          </div>
        </div>
      )}
    </section>
  )
}
