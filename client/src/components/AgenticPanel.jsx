/**
 * AgenticPanel.jsx
 *
 * Two-phase agentic generation with user confirmation between phases.
 *
 * State machine:
 *   idle → planning → confirming → running → done
 *                  ↘ error       ↗ cancel→idle  ↘ error
 *
 * /agentic/plan  — regular JSON, runs orchestrator, returns proposed plan
 * /agentic/run   — SSE stream, runs parallel agents given the accepted plan
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import css from './AgenticPanel.module.css'

// ── SSE reader ─────────────────────────────────────────────────────────────────

async function* readSSE(response) {
  const reader  = response.body.getReader()
  const decoder = new TextDecoder()
  let   buffer  = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const blocks = buffer.split('\n\n')
    buffer = blocks.pop()

    for (const block of blocks) {
      if (!block.trim()) continue
      let eventType = 'message'
      let eventData = ''
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) eventType = line.slice(7).trim()
        if (line.startsWith('data: '))  eventData += (eventData ? '\n' : '') + line.slice(6)
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

export default function AgenticPanel({
  projectName,
  recipe,
  zones,
  repeatableSlides,
  onJsonReady,
  // State props
  status,
  phase,
  logs,
  agents,
  errorMsg,
  elapsed,
  contentPrompt,
  plan,
  // Setters
  setStatus,
  setPhase,
  setLogs,
  setAgents,
  setErrorMsg,
  setElapsed,
  setContentPrompt,
  setPlan,
}) {
  // status: idle | planning | confirming | running | done | error
  // Plan returned by /agentic/plan, held during confirming state
  // { instances, contextSummary, rationale, agentPlan, contextFiles }

  const logEndRef  = useRef(null)
  const timerRef   = useRef(null)
  const abortRef   = useRef(null)
  const [copiedId, setCopiedId] = useState(null)

   const [availableColumns, setAvailableColumns]         = useState([])
   const [groupingColumn, setGroupingColumn]             = useState('')
   const [columnsLoading, setColumnsLoading]             = useState(false)
   const [filters, setFilters]                           = useState([])
   const [expandedFilterId, setExpandedFilterId]         = useState(null)
   const [filterValuesLoading, setFilterValuesLoading]   = useState(false)
   const [filterColumnValues, setFilterColumnValues]     = useState({})
  const hasRecipe = Boolean(recipe?.trim())
  const isActive  = status === 'planning' || status === 'running'

  // Fetch column names whenever projectName changes
  useEffect(() => {
    if (!projectName) { setAvailableColumns([]); return }
    let cancelled = false
    setColumnsLoading(true)
    fetch(`/api/opencode/agentic/context-columns?projectName=${encodeURIComponent(projectName)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(data => { if (!cancelled) setAvailableColumns(data.columns || []) })
      .catch(() => { if (!cancelled) setAvailableColumns([]) })
      .finally(() => { if (!cancelled) setColumnsLoading(false) })
    return () => { cancelled = true }
  }, [projectName])

   // Fetch unique values when expanded filter column changes
   useEffect(() => {
     if (!expandedFilterId || !projectName) {
       setFilterValuesLoading(false)
       return
     }
     const filter = filters.find(f => f.id === expandedFilterId)
     if (!filter || !filter.column) return
     
     let cancelled = false
     setFilterValuesLoading(true)
     fetch(`/api/opencode/agentic/context-column-values?projectName=${encodeURIComponent(projectName)}&column=${encodeURIComponent(filter.column)}`)
       .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
       .then(data => {
         if (!cancelled) {
           const vals = data.values || []
           setFilterColumnValues(prev => ({ ...prev, [filter.column]: vals }))
         }
       })
       .catch(() => { if (!cancelled) setFilterColumnValues(prev => ({ ...prev, [filter.column]: [] })) })
       .finally(() => { if (!cancelled) setFilterValuesLoading(false) })
     return () => { cancelled = true }
   }, [expandedFilterId, filters, projectName])

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [logs])

  // Elapsed timer — only ticks during the generation phase
  useEffect(() => {
    if (status === 'running') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [status])

   const appendLog    = (msg) => setLogs(prev => [...prev, msg])
   const updateAgent  = (id, state, extra = {}) =>
     setAgents(prev => prev.map(a => a.id === id ? { ...a, state, ...extra } : a))

   const addFilter = useCallback(() => {
     const newId = `filter-${Date.now()}`
     const newFilter = { id: newId, column: '', values: [] }
     setFilters(prev => [...prev, newFilter])
     setExpandedFilterId(newId)
   }, [])

   const removeFilter = useCallback((id) => {
     setFilters(prev => prev.filter(f => f.id !== id))
     if (expandedFilterId === id) setExpandedFilterId(null)
   }, [expandedFilterId])

   const updateFilterColumn = useCallback((id, column) => {
     setFilters(prev => prev.map(f => 
       f.id === id ? { ...f, column, values: [] } : f
     ))
     setFilterColumnValues(prev => ({ ...prev, [column]: [] }))
   }, [])

   const updateFilterValues = useCallback((id, values) => {
     setFilters(prev => prev.map(f => 
       f.id === id ? { ...f, values } : f
     ))
   }, [])

   // ── Phase 1: call /plan, pause for confirmation ────────────────────────────

   const handleGenerate = useCallback(async () => {
    if (!hasRecipe || isActive) return

    setStatus('planning')
    setPhase('analyzing')
    setPlan(null)
    setLogs([])
    setAgents([])
    setErrorMsg('')
    setElapsed(0)

    try {
       const response = await fetch('/api/opencode/agentic/plan', {
         method:  'POST',
         headers: { 'Content-Type': 'application/json' },
         body:    JSON.stringify({
           projectName, recipe, zones, repeatableSlides, contentPrompt,
           groupingColumn: groupingColumn || null,
           filters: filters.filter(f => f.column && f.values.length > 0),
         }),
       })
      if (!response.ok) throw new Error(`Server error ${response.status}`)

      for await (const { type, data } of readSSE(response)) {
        switch (type) {
          case 'phase': setPhase(data); break
          case 'log':   appendLog(data); break
          case 'plan':
            setPlan(JSON.parse(data))
            setStatus('confirming')
            break
          case 'error':
            setStatus('error')
            setErrorMsg(JSON.parse(data))
            break
        }
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message)
    }
   }, [hasRecipe, isActive, projectName, recipe, zones, repeatableSlides, contentPrompt, groupingColumn, filters, setStatus, setPhase, setLogs, setAgents, setErrorMsg, setElapsed, setPlan])

  // ── Phase 2: user accepted — call /run SSE stream ─────────────────────────

  const handleAccept = useCallback(async () => {
    if (!plan) return

    setStatus('running')
    setPhase('generating')
    setLogs([])
    setAgents([])
    setElapsed(0)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/opencode/agentic/run', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          projectName,
          recipe,
          zones,
          repeatableSlides,
          instances:      plan.instances,
          instanceNames:  plan.instanceNames,
          contextSummary: plan.contextSummary,
          contentPrompt,
        }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error(`Server error ${response.status}`)

      for await (const { type, data } of readSSE(response)) {
        switch (type) {
          case 'phase':        setPhase(data); break
          case 'log':          appendLog(data); break
          case 'agents':       setAgents(JSON.parse(data)); break
          case 'agent_update': { const u = JSON.parse(data); updateAgent(u.id, u.state, { output: u.output, errorDetail: u.errorDetail }); break }
          case 'done':         setStatus('done'); onJsonReady?.(data); break
          case 'error':        setStatus('error'); setErrorMsg(JSON.parse(data)); break
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setStatus('error')
        setErrorMsg(err.message)
      }
    }
  }, [plan, projectName, recipe, zones, repeatableSlides, onJsonReady, setStatus, setPhase, setLogs, setAgents, setErrorMsg, setElapsed])

  const handleCopyAgent = useCallback((agent) => {
    const text = agent.state === 'error'
      ? (agent.errorDetail ?? `Agent "${agent.label}" failed with no detail`)
      : (agent.output ?? '')
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(agent.id)
      setTimeout(() => setCopiedId(id => id === agent.id ? null : id), 1500)
    })
  }, [])

  const handleCancel = () => {
    abortRef.current?.abort()
    setStatus('idle')
    setPhase('')
    setPlan(null)
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

      {/* ── Content instructions ─────────────────────────────────────────── */}
      <div className={css.promptSection}>
        <label htmlFor="contentPrompt" className={css.promptLabel}>
          Content instructions
          <span className={css.promptHint}>Guides what slide content the AI generates</span>
        </label>
        <textarea
          id="contentPrompt"
          className={css.promptTextarea}
          value={contentPrompt}
          onChange={(e) => setContentPrompt(e.target.value)}
          disabled={isActive || status === 'confirming'}
          placeholder="e.g. Generate 3 product slides focusing on the enterprise tier"
        />
      </div>

      {/* ── Grouping column picker ───────────────────────────────────────── */}
      {availableColumns.length > 0 && (
        <div className={css.columnPickerSection}>
          <label htmlFor="groupingColumn" className={css.columnPickerLabel}>
            Grouping column
            <span className={css.columnPickerHint}>One slide instance per unique value in this column</span>
          </label>
          <div className={css.columnPickerRow}>
            <select
              id="groupingColumn"
              className={css.columnSelect}
              value={groupingColumn}
              onChange={e => setGroupingColumn(e.target.value)}
              disabled={isActive || status === 'confirming'}
            >
              <option value="">AI decides grouping</option>
              {availableColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
            {groupingColumn && (
              <button
                className={css.columnClearBtn}
                onClick={() => setGroupingColumn('')}
                disabled={isActive || status === 'confirming'}
                title="Clear — let AI decide"
              >×</button>
            )}
          </div>
        </div>
      )}

      {columnsLoading && (
        <p className={css.columnsLoadingHint}>Loading columns…</p>
      )}

       {/* ── Filter data ─────────────────────────────────────────────────── */}
       {availableColumns.length > 0 && (
         <div className={css.columnPickerSection}>
           <label className={css.columnPickerLabel}>
             Filter data
             <span className={css.columnPickerHint}>Add filters to limit which rows the AI receives</span>
           </label>

           {/* Active filters list */}
           {filters.length > 0 && (
             <div className={css.filterChipsList}>
               {filters.map(filter => (
                 <div key={filter.id} className={css.filterChip}>
                   <div className={css.filterChipContent}>
                     <span className={css.filterChipLabel}>
                       {filter.column || 'Select column'}
                       {filter.column && filter.values.length > 0 && (
                         <span className={css.filterChipCount}>{filter.values.length}</span>
                       )}
                     </span>
                   </div>
                   <button
                     className={css.filterChipRemoveBtn}
                     onClick={() => removeFilter(filter.id)}
                     disabled={isActive || status === 'confirming'}
                     title="Remove filter"
                   >×</button>
                 </div>
               ))}
             </div>
           )}

           {/* Expanded filter editor */}
           {expandedFilterId && (
             <div className={css.filterEditor}>
               {(() => {
                 const filter = filters.find(f => f.id === expandedFilterId)
                 if (!filter) return null
                 const availableValues = filter.column ? (filterColumnValues[filter.column] || []) : []
                 const selectedValuesSet = new Set(filter.values)
                 
                 return (
                   <>
                     <div className={css.filterEditorHeader}>
                       <span className={css.filterEditorTitle}>Edit filter</span>
                       <button
                         className={css.filterEditorCloseBtn}
                         onClick={() => setExpandedFilterId(null)}
                         title="Close"
                       >×</button>
                     </div>

                     <div className={css.filterEditorSection}>
                       <label className={css.filterEditorLabel}>Column</label>
                       <select
                         className={css.columnSelect}
                         value={filter.column}
                         onChange={e => updateFilterColumn(filter.id, e.target.value)}
                         disabled={isActive || status === 'confirming'}
                       >
                         <option value="">Select a column</option>
                         {availableColumns.map(col => (
                           <option key={col} value={col}>{col}</option>
                         ))}
                       </select>
                     </div>

                     {filterValuesLoading && (
                       <p className={css.columnsLoadingHint}>Loading values…</p>
                     )}

                     {filter.column && !filterValuesLoading && availableValues.length > 0 && (
                       <div className={css.filterEditorSection}>
                         <div className={css.filterValuesHeader}>
                           <span className={css.filterValuesCount}>
                             {filter.values.length} of {availableValues.length} selected
                           </span>
                           <button
                             className={css.filterToggleBtn}
                             onClick={() => updateFilterValues(filter.id, [...availableValues])}
                             disabled={isActive || status === 'confirming'}
                           >All</button>
                           <button
                             className={css.filterToggleBtn}
                             onClick={() => updateFilterValues(filter.id, [])}
                             disabled={isActive || status === 'confirming'}
                           >None</button>
                         </div>
                         <div className={css.filterCheckboxList}>
                           {availableValues.map(val => (
                             <label key={val} className={css.filterCheckboxItem}>
                               <input
                                 type="checkbox"
                                 checked={selectedValuesSet.has(val)}
                                 onChange={e => {
                                   if (e.target.checked) updateFilterValues(filter.id, [...filter.values, val])
                                   else updateFilterValues(filter.id, filter.values.filter(v => v !== val))
                                 }}
                                 disabled={isActive || status === 'confirming'}
                               />
                               <span className={css.filterCheckboxLabel}>{val}</span>
                             </label>
                           ))}
                         </div>
                         {filter.values.length === 0 && (
                           <p className={css.filterWarning}>No values selected for this filter</p>
                         )}
                       </div>
                     )}
                   </>
                 )
               })()}
             </div>
           )}

           {/* Add filter button */}
           <button
             className={css.addFilterBtn}
             onClick={addFilter}
             disabled={isActive || status === 'confirming'}
           >+ Add filter</button>
         </div>
       )}

       {/* ── Trigger row ─────────────────────────────────────────────────── */}
       <div className={css.triggerRow}>
         {(() => {
           const hasInvalidFilters = filters.some(f => f.column && f.values.length === 0)
           return (
             <button
               className={`${css.generateBtn} ${isActive ? css.running : ''}`}
               onClick={isActive ? undefined : handleGenerate}
               disabled={!hasRecipe || isActive || status === 'confirming' || hasInvalidFilters}
             >
               {status === 'planning'  ? 'Analysing…'     :
                status === 'running'   ? 'Generating…'    :
                                         '✦ Generate with AI'}
             </button>
           )
         })()}

        {status === 'running' && <span className={css.timer}>{elapsed}s</span>}

        {!hasRecipe && status === 'idle' && (
          <span className={css.noRecipeHint}>Generate the recipe first ↑</span>
        )}
      </div>

      {/* ── Phase stepper ───────────────────────────────────────────────── */}
      {(status === 'planning' || status === 'confirming' || status === 'running' || status === 'done') && (
        <div className={css.stepper}>
          {PHASES.map((p, i) => {
            const isDone   = (status === 'confirming' && i <= 1)
                          || (currentPhaseIdx > i && status !== 'confirming')
                          || status === 'done'
            const isActive = currentPhaseIdx === i && (status === 'planning' || status === 'running')
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

      {/* ── Confirmation card ────────────────────────────────────────────── */}
      {status === 'confirming' && plan && (
        <div className={css.confirmCard}>
          <div className={css.confirmHeader}>
            <span className={css.confirmIcon}>◎</span>
            <span className={css.confirmTitle}>Ready to generate</span>
          </div>

          {plan.rationale && (
            <p className={css.confirmRationale}>{plan.rationale}</p>
          )}

          <ul className={css.confirmList}>
            {plan.agentPlan.map(a => (
              <li key={a.id} className={css.confirmItem}>
                <span className={css.confirmDot} />
                {a.id === 'blocks' ? a.label : <strong>{a.label}</strong>}
              </li>
            ))}
          </ul>

          <p className={css.confirmCount}>
            {plan.agentPlan.length} agent{plan.agentPlan.length !== 1 ? 's' : ''} will run in parallel
            {plan.contextFiles > 0 && ` · ${plan.contextFiles} context file${plan.contextFiles !== 1 ? 's' : ''} loaded`}
            {plan.groupingColumn && (
              <span className={css.confirmGroupingTag}>grouped by <strong>{plan.groupingColumn}</strong></span>
            )}
          </p>

          <div className={css.confirmActions}>
            <button className={css.acceptBtn} onClick={handleAccept}>
              Accept &amp; Generate
            </button>
            <button className={css.cancelBtn} onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Agent chips ──────────────────────────────────────────────────── */}
      {agents.length > 0 && (
        <div className={css.chipsSection}>
          <div className={css.chipsLabel}>Agents</div>
          <div className={css.chips}>
            {agents.map(agent => {
              const isCopyable = agent.state === 'done' || agent.state === 'error'
              const isCopied   = copiedId === agent.id
              const Tag        = isCopyable ? 'button' : 'div'
              return (
                <Tag
                  key={agent.id}
                  className={`${css.chip} ${css[agent.state]} ${isCopyable ? css.chipCopyable : ''} ${isCopied ? css.chipCopied : ''}`}
                  {...(isCopyable ? { onClick: () => handleCopyAgent(agent), title: 'Click to copy output' } : {})}
                >
                  {agent.state === 'running' && <div className={css.chipSpinner} />}
                  {isCopied
                    ? 'Copied ✓'
                    : <>
                        {agent.state === 'done'  && '✓ '}
                        {agent.state === 'error' && '✕ '}
                        {agent.label}
                        {isCopyable && <span className={css.chipCopyIcon}>⧉</span>}
                      </>
                  }
                </Tag>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Activity log ─────────────────────────────────────────────────── */}
      {logs.length > 0 && (
        <div className={css.logSection}>
          <div className={css.logLabel}>Activity</div>
          <div className={css.log}>
            {logs.map((line, i) => (
              <span key={i} className={`${css.logLine} ${i === logs.length - 1 ? css.latest : ''}`}>
                {line}{'\n'}
              </span>
            ))}
            <span ref={logEndRef} />
          </div>
        </div>
      )}

      {/* ── Success banner ───────────────────────────────────────────────── */}
      {status === 'done' && (
        <div className={css.successBanner}>
          <span>✓</span>
          <span>JSON generated and pasted into the Response field. Review and apply when ready.</span>
        </div>
      )}

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {status === 'error' && (
        <div className={css.errorBanner}>
          <strong>Generation failed</strong>
          <pre className={css.errorDetail}>{errorMsg}</pre>
          <div className={css.errorActions}>
            <button className={css.resetBtn} onClick={handleCancel}>Try again</button>
            <button className={css.copyBtn} onClick={() => navigator.clipboard.writeText(errorMsg)}>Copy error</button>
          </div>
        </div>
      )}
    </section>
  )
}
