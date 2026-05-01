/**
 * HtmlRecipeStep - Stage 2 of the HTML Visual Flow.
 * Agentic-only generation flow.
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import AppHeader from '../components/AppHeader.jsx'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import agenticCss from '../components/AgenticPanel.module.css'
import ContentReviewTable from '../components/ContentReviewTable'

export default function HtmlRecipeStep({
  project,
  projectName,
  flowId,
  step,
  canNavigateTo,
  navigateTo,
  onBack,
  onApplied,
  onAiResponseChange,
  setToast,
  debugContext,
  agenticStatus,
  agenticPhase,
  agenticLogs,
  agenticAgents,
  agenticErrorMsg,
  agenticElapsed,
  agenticContentPrompt,
  agenticPlan,
  setAgenticStatus,
  setAgenticPhase,
  setAgenticLogs,
  setAgenticAgents,
  setAgenticErrorMsg,
  setAgenticElapsed,
  setAgenticContentPrompt,
  setAgenticPlan,
}) {
  const { selections = [], zones = [] } = project

  const [jsonInput, setJsonInput] = useState(project?.agenticJsonResponse ? (typeof project.agenticJsonResponse === 'string' ? project.agenticJsonResponse : JSON.stringify(project.agenticJsonResponse, null, 2)) : '')
  const [validation, setValidation] = useState(null)
  const [applying, setApplying] = useState(false)
  const [applySuccess, setApplySuccess] = useState(false)
  const [contextFiles, setContextFiles] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [loadingContextFiles, setLoadingContextFiles] = useState(false)
  const [agenticPhaseLocal, setAgenticPhaseLocal] = useState('')
  const [agenticLogsLocal, setAgenticLogsLocal] = useState([])
  const [agenticAgentsLocal, setAgenticAgentsLocal] = useState([])
  const [agenticElapsedLocal, setAgenticElapsedLocal] = useState(0)
  const [agenticPlanLocal, setAgenticPlanLocal] = useState(null)
  const [agenticErrorMsgLocal, setAgenticErrorMsgLocal] = useState('')
  const [agenticCustomInput, setAgenticCustomInput] = useState(project?.agenticCustomInput || '')
  const [sliceTemplates, setSliceTemplates] = useState([])
  const [sliceOutputTemplate, setSliceOutputTemplate] = useState(project?.sliceOutputTemplate || null)
  const [groupingColumn, setGroupingColumn] = useState(project?.groupingColumn || '')
  const [availableColumns, setAvailableColumns] = useState([])
  const [columnsLoading, setColumnsLoading] = useState(false)
  const [retryingAgents, setRetryingAgents] = useState(new Set())

  const customInputSaveTimerRef = useRef(null)
  const validateTimerRef = useRef(null)
  const agenticLogEndRef = useRef(null)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  const fetchContextFiles = useCallback(async () => {
    setLoadingContextFiles(true)
    try {
      const res = await fetch(`/api/html-flow/context-files?projectName=${encodeURIComponent(projectName)}`)
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setContextFiles((data.files || []).map(f => ({ filename: f.name, ext: f.ext })))
      if (project.selectedContextFiles) setSelectedFiles(project.selectedContextFiles)
    } catch (err) {
      setToast({ message: 'Failed to load context files: ' + err.message, type: 'error' })
    } finally {
      setLoadingContextFiles(false)
    }
  }, [project.selectedContextFiles, projectName, setToast])

  useEffect(() => {
    if (contextFiles.length === 0) fetchContextFiles()
    if (sliceTemplates.length === 0) {
      fetch('/api/opencode/slice-templates').then(r => r.json()).then(data => setSliceTemplates(Array.isArray(data) ? data : [])).catch(() => {})
    }
  }, [contextFiles.length, fetchContextFiles, sliceTemplates.length])

  useEffect(() => {
    if (!projectName) return
    setColumnsLoading(true)
    const params = new URLSearchParams({ projectName })
    if (selectedFiles.length > 0) params.set('selectedFiles', selectedFiles.join(','))
    fetch(`/api/opencode/agentic/context-columns?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(data => setAvailableColumns(data.columns || []))
      .catch(() => setAvailableColumns([]))
      .finally(() => setColumnsLoading(false))
  }, [projectName, selectedFiles])

  const saveSelectedFilesToFlow = useCallback(async (files) => {
    try {
      await fetch(`/api/projects/${projectName}/flows/${flowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedContextFiles: files }),
      })
    } catch {
    }
  }, [flowId, projectName])

  const saveSliceOutputTemplateToFlow = useCallback(async (filename) => {
    try {
      await fetch(`/api/projects/${projectName}/flows/${flowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sliceOutputTemplate: filename }),
      })
    } catch {
    }
  }, [flowId, projectName])

  const saveGroupingColumnToFlow = useCallback(async (value) => {
    try {
      await fetch(`/api/projects/${projectName}/flows/${flowId}/agentic`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupingColumn: value || null }),
      })
    } catch {}
  }, [flowId, projectName])

  const saveAgenticCustomInputToFlow = useCallback(async (value) => {
    try {
      await fetch(`/api/projects/${projectName}/flows/${flowId}/agentic`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agenticCustomInput: value }),
      })
    } catch {
    }
  }, [flowId, projectName])

  const saveAgenticJsonResponseToFlow = useCallback(async (value) => {
    try {
      await fetch(`/api/projects/${projectName}/flows/${flowId}/agentic`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agenticJsonResponse: value }),
      })
    } catch {
    }
  }, [flowId, projectName])

  useEffect(() => {
    if (project.contentPrompt && !agenticContentPrompt) {
      setAgenticContentPrompt(project.contentPrompt)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const validateJson = useCallback(async (value) => {
    if (!value.trim()) {
      setValidation(null)
      onAiResponseChange?.(null)
      return
    }
    try {
      const res = await fetch('/api/html-flow/validate-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, flowId, jsonString: value }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setValidation(data)
      onAiResponseChange?.({ raw: value, validated: true, validationResult: data })
    } catch (err) {
      const errorData = { valid: false, error: 'Validation failed: ' + err.message }
      setValidation(errorData)
      onAiResponseChange?.({ raw: value, validated: true, validationResult: errorData })
    }
  }, [flowId, onAiResponseChange, projectName])

  const handleJsonChange = useCallback((value) => {
    setJsonInput(value)
    clearTimeout(validateTimerRef.current)
    validateTimerRef.current = setTimeout(() => validateJson(value), 400)
  }, [validateJson])

  const handleApply = useCallback(async () => {
    if (!validation?.valid || applying) return
    setApplying(true)
    try {
      const res = await fetch('/api/html-flow/apply-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, flowId, jsonString: jsonInput }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Apply failed')
      setApplySuccess(true)
      onApplied({ outputFile: data.outputFile, previewHtml: data.previewHtml, roundId: data.roundId, slideCount: data.slideCount ?? 1, slideNames: data.slideNames ?? [] })
    } catch (err) {
      setToast({ message: 'Apply failed: ' + err.message, type: 'error' })
    } finally {
      setApplying(false)
    }
  }, [applying, flowId, jsonInput, onApplied, projectName, setToast, validation?.valid])

  const readSSE = async function* (response) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
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
          if (line.startsWith('data: ')) eventData += (eventData ? '\n' : '') + line.slice(6)
        }
        if (eventData !== '') yield { type: eventType, data: eventData }
      }
    }
  }

  const handleAgenticGenerate = useCallback(async () => {
    setAgenticStatus('planning')
    setAgenticPhaseLocal('analyzing')
    setAgenticPlanLocal(null)
    setAgenticLogsLocal([])
    setAgenticAgentsLocal([])
    setAgenticErrorMsgLocal('')
    setAgenticElapsedLocal(0)

    try {
      const response = await fetch('/api/opencode/agentic/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          flowId,
          recipe: '',
          zones,
          repeatableSlides: project.repeatableSlides || [],
          contentPrompt: agenticContentPrompt,
          customInput: agenticCustomInput,
          selectedFiles,
          sliceOutputTemplate,
          groupingColumn: groupingColumn || null,
        }),
      })
      if (!response.ok) throw new Error(`Server error ${response.status}`)

      for await (const { type, data } of readSSE(response)) {
        if (type === 'phase') setAgenticPhaseLocal(data)
        if (type === 'log') setAgenticLogsLocal(prev => [...prev, data])
        if (type === 'plan') {
          const planData = JSON.parse(data)
          setAgenticPlanLocal(planData)
          setAgenticStatus('confirming')
        }
        if (type === 'error') {
          setAgenticStatus('error')
          setAgenticErrorMsgLocal(data)
        }
      }
    } catch (err) {
      setAgenticStatus('error')
      setAgenticErrorMsgLocal(err.message)
    }
  }, [agenticContentPrompt, agenticCustomInput, flowId, project.repeatableSlides, projectName, readSSE, selectedFiles, setAgenticErrorMsgLocal, setAgenticLogsLocal, setAgenticPlanLocal, setAgenticPhaseLocal, setAgenticStatus, sliceOutputTemplate, zones])

  const handleAgenticAccept = useCallback(async () => {
    if (!agenticPlanLocal) return
    setAgenticStatus('running')
    setAgenticPhaseLocal('generating')
    setAgenticLogsLocal([])
    setAgenticAgentsLocal([])
    setAgenticElapsedLocal(0)
    try {
      const response = await fetch('/api/opencode/agentic/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          flowId,
          zones,
          repeatableSlides: project.repeatableSlides || [],
          instances: agenticPlanLocal.instances,
          instanceNames: agenticPlanLocal.instanceNames,
          contentPrompt: agenticContentPrompt,
          customInput: agenticCustomInput,
        }),
      })
      if (!response.ok) throw new Error(`Server error ${response.status}`)
      for await (const { type, data } of readSSE(response)) {
        if (type === 'phase') setAgenticPhaseLocal(data)
        if (type === 'log') setAgenticLogsLocal(prev => [...prev, data])
        if (type === 'agents') setAgenticAgentsLocal(JSON.parse(data))
        if (type === 'agent_update') {
          const u = JSON.parse(data)
          setAgenticAgentsLocal(prev => prev.map(a => a.id === u.id ? { ...a, state: u.state } : a))
        }
        if (type === 'done') {
          setAgenticStatus('done')
          setJsonInput(data)
          setValidation(null)
          handleJsonChange(data)
          saveAgenticJsonResponseToFlow(data)
          setToast({ message: 'JSON generated - review and apply when ready', type: 'success' })
        }
        if (type === 'error') {
          setAgenticStatus('error')
          setAgenticErrorMsgLocal(data)
        }
      }
    } catch (err) {
      setAgenticStatus('error')
      setAgenticErrorMsgLocal(err.message)
    }
  }, [agenticCustomInput, agenticPlanLocal, agenticContentPrompt, flowId, handleJsonChange, project.repeatableSlides, projectName, saveAgenticJsonResponseToFlow, selectedFiles, setAgenticStatus, setToast, zones])

  const handleAgenticCancel = () => {
    setAgenticStatus('idle')
    setAgenticPhaseLocal('')
    setAgenticPlanLocal(null)
    setAgenticLogsLocal([])
    setAgenticAgentsLocal([])
    setAgenticErrorMsgLocal('')
    setAgenticElapsedLocal(0)
  }

  const handleAgenticRetry = useCallback(async (agentId) => {
    setRetryingAgents(prev => new Set([...prev, agentId]))
    setAgenticAgentsLocal(prev => prev.map(a => a.id === agentId ? { ...a, state: 'running' } : a))
    try {
      const res = await fetch('/api/opencode/agentic/retry-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          flowId,
          agentId,
          zones,
          repeatableSlides: project.repeatableSlides || [],
          instances: agenticPlanLocal?.instances || {},
          contentPrompt: agenticContentPrompt,
          customInput: agenticCustomInput,
          currentJson: jsonInput,
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Retry failed')
      setAgenticAgentsLocal(prev => prev.map(a => a.id === agentId ? { ...a, state: 'done' } : a))
      handleJsonChange(data.json)
      saveAgenticJsonResponseToFlow(data.json)
      setToast({ message: 'Agent retried successfully', type: 'success' })
    } catch (err) {
      setAgenticAgentsLocal(prev => prev.map(a => a.id === agentId ? { ...a, state: 'error' } : a))
      setToast({ message: 'Retry failed: ' + err.message, type: 'error' })
    } finally {
      setRetryingAgents(prev => { const s = new Set(prev); s.delete(agentId); return s })
    }
  }, [agenticContentPrompt, agenticCustomInput, agenticPlanLocal, flowId, handleJsonChange, jsonInput, project.repeatableSlides, projectName, saveAgenticJsonResponseToFlow, setToast, zones])

  useEffect(() => {
    if (agenticStatus === 'running') {
      const timer = setInterval(() => setAgenticElapsedLocal(e => e + 1), 1000)
      return () => clearInterval(timer)
    }
  }, [agenticStatus])

  useEffect(() => {
    agenticLogEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [agenticLogsLocal])

  const totalCount = selections.length || zones.length
  const currentPhaseIdx = ['analyzing', 'planning', 'generating', 'assembling'].indexOf(agenticPhaseLocal)
  const isAgenticActive = agenticStatus === 'planning' || agenticStatus === 'running'

  const getExtBadgeClass = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext === 'md') return 'ext-badge ext-badge-md'
    if (ext === 'docx') return 'ext-badge ext-badge-docx'
    if (ext === 'xlsx') return 'ext-badge ext-badge-xlsx'
    return 'ext-badge ext-badge-other'
  }

  const handleToggleFile = (filename) => {
    const updated = selectedFiles.includes(filename) ? selectedFiles.filter(f => f !== filename) : [...selectedFiles, filename]
    setSelectedFiles(updated)
    saveSelectedFilesToFlow(updated)
  }

  const handleSelectAllFiles = () => {
    const allSelected = selectedFiles.length === contextFiles.length
    const updated = allSelected ? [] : contextFiles.map(f => f.filename)
    setSelectedFiles(updated)
    saveSelectedFilesToFlow(updated)
  }

  const handleAgenticCustomInputChange = (value) => {
    setAgenticCustomInput(value)
    clearTimeout(customInputSaveTimerRef.current)
    customInputSaveTimerRef.current = setTimeout(() => saveAgenticCustomInputToFlow(value), 500)
  }

  return (
    <div className="app">
      <AppHeader title={projectName} subtitle={`${totalCount} zone${totalCount !== 1 ? 's' : ''} · Generate content with AI`} debugContext={debugContext} />
      <Breadcrumbs step={step} canNavigateTo={canNavigateTo} navigateTo={navigateTo} flow="html" />

      {applySuccess && (
        <div className="apply-success-banner">
          <span className="apply-success-icon">✓</span>
          <span className="apply-success-text">Slides applied successfully! Taking you to preview…</span>
        </div>
      )}

      <div className="recipe-tab-panel">
        <div className="agentic-tab-layout">
          <div className="context-files-panel">
            <div className="context-files-header">
              <h4>Context Files</h4>
              {contextFiles.length > 0 && (
                <div className="context-files-controls">
                  <button className="context-files-link" onClick={handleSelectAllFiles}>
                    {selectedFiles.length === contextFiles.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              )}
            </div>
            {loadingContextFiles ? (
              <div className="context-files-loading">Loading context files…</div>
            ) : contextFiles.length === 0 ? (
              <div className="context-files-empty"><p>No context files found. Add files to the 'AI Context' folder in your project.</p></div>
            ) : (
              <div className="context-files-list">
                {contextFiles.map(file => (
                  <div key={file.filename} className="context-file-row">
                    <label className="context-file-label">
                      <input type="checkbox" checked={selectedFiles.includes(file.filename)} onChange={() => handleToggleFile(file.filename)} className="context-file-checkbox" />
                      <span className="context-file-name">{file.filename}</span>
                      <span className={getExtBadgeClass(file.filename)}>{file.filename.split('.').pop()?.toLowerCase()}</span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="agentic-prompt-section">
            <label htmlFor="sliceOutputTemplate" className="agentic-prompt-label">
              Slice output template
              <span className="agentic-prompt-hint agentic-prompt-hint--required">Required</span>
            </label>
            <select id="sliceOutputTemplate" className={`agentic-template-select${!sliceOutputTemplate ? ' agentic-template-select--empty' : ''}`} value={sliceOutputTemplate || ''} onChange={e => { const val = e.target.value || null; setSliceOutputTemplate(val); saveSliceOutputTemplateToFlow(val) }} disabled={isAgenticActive || agenticStatus === 'confirming'}>
              <option value="">— Select a template —</option>
              {sliceTemplates.map(t => <option key={t.filename} value={t.filename} title={t.description}>{t.name}</option>)}
            </select>
          </div>

          <div className="agentic-prompt-section">
            <label htmlFor="agenticCustomInput" className="agentic-prompt-label">What should the AI generate?</label>
            <textarea id="agenticCustomInput" className="agentic-prompt-textarea" value={agenticCustomInput} onChange={e => handleAgenticCustomInputChange(e.target.value)} disabled={isAgenticActive || agenticStatus === 'confirming'} placeholder="Describe the slides you want - tone, focus, number of instances, anything specific…" />
          </div>

          {(availableColumns.length > 0 || columnsLoading) && (
            <div className="agentic-prompt-section">
              <label htmlFor="groupingColumn" className="agentic-prompt-label">
                Grouping column
                <span className="agentic-prompt-hint">One slide instance per unique value · leave blank for AI to decide</span>
              </label>
              {columnsLoading ? (
                <div className="agentic-columns-loading">Loading columns…</div>
              ) : (
                <div className="agentic-column-picker-row">
                  <select
                    id="groupingColumn"
                    className="agentic-template-select"
                    value={groupingColumn}
                    onChange={e => {
                      setGroupingColumn(e.target.value)
                      saveGroupingColumnToFlow(e.target.value)
                    }}
                    disabled={isAgenticActive || agenticStatus === 'confirming'}
                  >
                    <option value="">AI decides grouping</option>
                    {availableColumns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  {groupingColumn && (
                    <button
                      className="agentic-column-clear-btn"
                      onClick={() => { setGroupingColumn(''); saveGroupingColumnToFlow('') }}
                      disabled={isAgenticActive || agenticStatus === 'confirming'}
                      title="Clear — let AI decide"
                    >×</button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="agentic-generate-section">
            <button className={`agentic-generate-btn ${isAgenticActive ? 'running' : ''}`} onClick={isAgenticActive ? undefined : handleAgenticGenerate} disabled={isAgenticActive || agenticStatus === 'confirming' || !sliceOutputTemplate}>{agenticStatus === 'planning' ? 'Analysing…' : agenticStatus === 'running' ? 'Generating…' : '✦ Generate with AI'}</button>
            {agenticStatus === 'running' && <span className={agenticCss.timer}>{agenticElapsedLocal}s</span>}
          </div>

          {(agenticStatus === 'planning' || agenticStatus === 'confirming' || agenticStatus === 'running' || agenticStatus === 'done') && (
            <div className={agenticCss.stepper}>
              {['analyzing', 'planning', 'generating', 'assembling'].map((label, index) => {
                const isDone = (agenticStatus === 'confirming' && index <= 1) || (currentPhaseIdx > index && agenticStatus !== 'confirming') || agenticStatus === 'done'
                const isActive = currentPhaseIdx === index && (agenticStatus === 'planning' || agenticStatus === 'running')
                return (
                  <div key={label} className={agenticCss.stepItem}>
                    <div className={`${agenticCss.stepDot} ${isDone ? agenticCss.done : ''} ${isActive ? agenticCss.active : ''}`}>{isDone ? '✓' : index + 1}</div>
                    <span className={`${agenticCss.stepLabel} ${isDone ? agenticCss.done : ''} ${isActive ? agenticCss.active : ''}`}>{label}</span>
                    {index < 3 && <div className={`${agenticCss.stepConnector} ${isDone ? agenticCss.done : ''}`} />}
                  </div>
                )
              })}
            </div>
          )}

          {agenticStatus === 'confirming' && agenticPlanLocal && (
            <div className={agenticCss.confirmCard}>
              <div className={agenticCss.confirmHeader}><span className={agenticCss.confirmIcon}>◎</span><span className={agenticCss.confirmTitle}>Review generated content</span></div>
              {agenticPlanLocal.rationale && (
                <p className={agenticCss.confirmRationale}>
                  {agenticPlanLocal.rationale}
                  {agenticPlanLocal.groupingColumn && (
                    <span className={agenticCss.confirmGroupingTag}>grouped by <strong>{agenticPlanLocal.groupingColumn}</strong></span>
                  )}
                </p>
              )}
              {agenticPlanLocal.contextSlices && Object.keys(agenticPlanLocal.contextSlices).length > 0 ? (
                <div className={agenticCss.reviewTableWrapper}><ContentReviewTable contextSlices={agenticPlanLocal.contextSlices} instanceNames={agenticPlanLocal.instanceNames || []} /></div>
              ) : (
                <div className={agenticCss.confirmRationale} style={{ fontStyle: 'italic' }}><strong style={{ fontStyle: 'normal' }}>No data preview available.</strong> Generation will still proceed using the full context files.</div>
              )}
              <div className={agenticCss.confirmActions}>
                <button className={agenticCss.acceptBtn} onClick={handleAgenticAccept}>Accept &amp; Generate</button>
                <button className={agenticCss.cancelBtn} onClick={handleAgenticCancel}>Cancel</button>
              </div>
            </div>
          )}

          {agenticAgentsLocal.length > 0 && (
            <div className={agenticCss.chipsSection}>
              <div className={agenticCss.chipsLabel}>Agents</div>
              <div className={agenticCss.chips}>
                {agenticAgentsLocal.map(agent => (
                  <div key={agent.id} className={`${agenticCss.chip} ${agenticCss[agent.state]}`}>
                    {agent.state === 'running' && <div className={agenticCss.chipSpinner} />}
                    {agent.state === 'done'    && '✓ '}
                    {agent.state === 'error'   && '✕ '}
                    {agent.label}
                    {agent.state === 'error' && !retryingAgents.has(agent.id) && (
                      <button
                        className={agenticCss.chipRetryBtn}
                        onClick={() => handleAgenticRetry(agent.id)}
                        title="Retry this agent"
                      >↺</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(agenticStatus === 'planning' || agenticStatus === 'running' || agenticStatus === 'done' || agenticStatus === 'error') && (
            <div className={agenticCss.logSection}>
              <div className={agenticCss.logLabel}>Activity</div>
              <div className={agenticCss.log}>
                {agenticLogsLocal.length === 0 ? <span className={agenticCss.logWaiting}>Connecting to AI…</span> : agenticLogsLocal.map((line, i) => <span key={i} className={`${agenticCss.logLine} ${i === agenticLogsLocal.length - 1 ? agenticCss.latest : ''}`}>{line}{'\n'}</span>)}
                <span ref={agenticLogEndRef} />
              </div>
            </div>
          )}

          {agenticStatus === 'done' && (
            <div className={agenticCss.successBanner}><span>✓</span><span>JSON generated and pasted into the Response field. Review and apply when ready.</span></div>
          )}

          {agenticStatus === 'error' && (
            <div className={agenticCss.errorBanner}>
              <strong>Generation failed</strong>
              <pre className={agenticCss.errorDetail}>{agenticErrorMsgLocal || agenticErrorMsg}</pre>
              <div className={agenticCss.errorActions}>
                <button className={agenticCss.resetBtn} onClick={handleAgenticCancel}>Try again</button>
                <button className={agenticCss.copyBtn} onClick={() => navigator.clipboard.writeText(agenticErrorMsgLocal || agenticErrorMsg)}>Copy error</button>
              </div>
            </div>
          )}

          <div className="agentic-json-section">
            <h4>JSON Response</h4>
            <div className="html-recipe-json-wrapper">
              <textarea className={`json-input${validation?.valid === false ? ' has-error' : ''}`} value={jsonInput} onChange={e => handleJsonChange(e.target.value)} placeholder="JSON will appear here after generation…" spellCheck={false} />
            </div>
            {validation?.valid === false && (
              <div className="validation-status invalid"><strong>{validation.error || 'Invalid JSON'}</strong></div>
            )}
            {validation?.valid === true && (
              <div className="validation-status valid">✓ {validation.foundFields?.length ?? 0} fields</div>
            )}
            <div className="html-recipe-actions">
              <button className="btn btn-link" onClick={onBack}><span aria-hidden="true">←</span> Back to template</button>
              <button className="btn btn-primary" onClick={handleApply} disabled={!validation?.valid || applying}>{applying ? 'Applying…' : <><span aria-hidden="true">→</span> Apply content</>}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
