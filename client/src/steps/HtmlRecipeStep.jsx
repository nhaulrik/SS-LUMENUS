/**
 * HtmlRecipeStep — Stage 2 of the HTML Visual Flow.
 *
 * Shows the AI recipe prompt, accepts the JSON response, validates it
 * against the zone list, and on success applies the content to the
 * HTML template (generating a patched output file).
 */

import { useRef, useState, useCallback } from 'react'
import AppHeader   from '../components/AppHeader.jsx'
import Breadcrumbs from '../components/Breadcrumbs.jsx'

export default function HtmlRecipeStep({
  project,          // { projectName, flowId, zones, selections }
  projectName,
  flowId,
  step,
  canNavigateTo,
  navigateTo,
  onBack,
  onApplied,        // ({ outputFile, previewHtml, roundId, slideCount }) => void
  onRecipeChange,
  onRecipeStateChange,
  onAiResponseChange,
  recipeState = { recipe: '', globalPrompt: '', jsonInput: '' },
  setToast,
  debugContext,
}) {
  const { selections = [], zones = [], repeatableSlides = [] } = project

  // ── Recipe ────────────────────────────────────────────────────────────────
  const [recipe,        setRecipe]        = useState(recipeState.recipe)
  const [globalPrompt,  setGlobalPrompt]  = useState(recipeState.globalPrompt)
  const [loadingRecipe, setLoadingRecipe] = useState(false)

   // ── JSON response ─────────────────────────────────────────────────────────
   const [jsonInput,  setJsonInput]  = useState(recipeState.jsonInput)
   const [validation, setValidation] = useState(null)
   const [applying,   setApplying]   = useState(false)

   // ── AI PoC ────────────────────────────────────────────────────────────
   const [customPrompt, setCustomPrompt] = useState('')
   const [aiResponse,   setAiResponse]   = useState('')
   const [debugLog,     setDebugLog]     = useState([])
   const [aiLoading,    setAiLoading]    = useState(false)

   const validateTimerRef = useRef(null)

   // ── AI PoC helpers ────────────────────────────────────────────────────────
   const addDebugLog = (message) => {
     const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false })
     setDebugLog(prev => [...prev, `[${timestamp}] ${message}`])
   }

   // ── Generate recipe ───────────────────────────────────────────────────────
  const handleGenerateRecipe = useCallback(async () => {
    setLoadingRecipe(true)
    try {
      const res = await fetch('/api/html-flow/generate-recipe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ projectName, flowId, globalPrompt, repeatableSlides }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Failed to generate recipe')
      setRecipe(data.recipe)
      onRecipeChange?.(data.recipe)
      onRecipeStateChange?.({ recipe: data.recipe, recipeGenerationId: data.generationId })
    } catch (err) {
      setToast({ message: 'Recipe generation failed: ' + err.message, type: 'error' })
    } finally {
      setLoadingRecipe(false)
    }
  }, [projectName, flowId, globalPrompt, repeatableSlides, setToast, onRecipeStateChange, onRecipeChange])

  // ── Validate JSON (debounced) ─────────────────────────────────────────────
  const validateJson = useCallback(async (value) => {
    if (!value.trim()) {
      setValidation(null)
      onAiResponseChange?.(null)
      return
    }
    try {
      const res = await fetch('/api/html-flow/validate-json', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ projectName, flowId, jsonString: value }),
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
  }, [projectName, flowId, onAiResponseChange])

  const handleJsonChange = useCallback((value) => {
    setJsonInput(value)
    onRecipeStateChange?.({ jsonInput: value })
    clearTimeout(validateTimerRef.current)
    validateTimerRef.current = setTimeout(() => validateJson(value), 400)
  }, [validateJson, onRecipeStateChange])

  // ── Apply content ─────────────────────────────────────────────────────────
  const handleApply = useCallback(async () => {
    if (!validation?.valid || applying) return
    setApplying(true)
    try {
      const res = await fetch('/api/html-flow/apply-content', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ projectName, flowId, jsonString: jsonInput }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Apply failed')
      onApplied({ outputFile: data.outputFile, previewHtml: data.previewHtml, roundId: data.roundId, slideCount: data.slideCount ?? 1 })
    } catch (err) {
      setToast({ message: 'Apply failed: ' + err.message, type: 'error' })
    } finally {
      setApplying(false)
    }
  }, [projectName, flowId, jsonInput, validation, applying, onApplied, setToast])

  // ── Copy helpers ──────────────────────────────────────────────────────────
  const handleCopyRecipe = useCallback(() => {
    navigator.clipboard.writeText(recipe)
    setToast({ message: 'Recipe copied!', type: 'success' })
  }, [recipe, setToast])

   const handleCopyJson = useCallback(() => {
     navigator.clipboard.writeText(jsonInput)
     setToast({ message: 'JSON copied!', type: 'success' })
   }, [jsonInput, setToast])

   // ── AI PoC handler ────────────────────────────────────────────────────────
   const handleSendToAi = async () => {
     if (!customPrompt.trim()) return

     setAiLoading(true)
     setAiResponse('')
     addDebugLog('Sending prompt to AI...')
     const startTime = Date.now()

     try {
       const res = await fetch('/api/ai-proxy/generate', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ prompt: customPrompt }),
       })

       const latencyMs = Date.now() - startTime

       if (!res.ok) {
         const errData = await res.json()
         throw new Error(errData.error || `HTTP ${res.status}`)
       }

       const data = await res.json()
       if (!data.ok) throw new Error(data.error)

       addDebugLog(`Response received in ${latencyMs}ms`)
       if (data.usage) {
         addDebugLog(`Tokens: input=${data.usage.inputTokens}, output=${data.usage.outputTokens}`)
       }

       setAiResponse(data.response)
     } catch (err) {
       addDebugLog(`Error: ${err.message}`)
       setToast?.({ type: 'error', message: 'AI call failed: ' + err.message })
     } finally {
       setAiLoading(false)
     }
   }

   const totalCount = (selections.length || zones.length)

  return (
    <div className="app">
      <AppHeader
        title={projectName}
        subtitle={`${totalCount} zone${totalCount !== 1 ? 's' : ''} · Generate content with AI`}
        debugContext={debugContext}
      />
      <Breadcrumbs step={step} canNavigateTo={canNavigateTo} navigateTo={navigateTo} flow="html" />

      <div className="html-recipe-layout">

        {/* ── Left: Recipe panel ─────────────────────────────────────────── */}
        <div className="html-recipe-left">
          <div className="html-recipe-panel">
            <div className="html-recipe-panel-header">
              <h3>Recipe Prompt</h3>
            </div>

            <div className="html-recipe-global-prompt">
              <label className="html-recipe-global-label">
                Global guidance
                <span className="html-recipe-global-sub">Optional context prepended to the recipe</span>
              </label>
              <textarea
                className="html-recipe-global-input"
                rows={2}
                value={globalPrompt}
                onChange={e => {
                  setGlobalPrompt(e.target.value)
                  onRecipeStateChange?.({ globalPrompt: e.target.value })
                }}
                placeholder='e.g. "Use formal language. Focus on EMEA market data."'
              />
            </div>

            <button
              className="btn btn-secondary html-recipe-generate-btn"
              onClick={handleGenerateRecipe}
              disabled={loadingRecipe}
            >
              {loadingRecipe ? 'Generating…' : recipe ? <><span aria-hidden="true">↻</span> Regenerate recipe</> : 'Generate recipe'}
            </button>

            {recipe ? (
              <div className="html-recipe-area-wrapper">
                <button className="copy-btn" onClick={handleCopyRecipe} aria-label="Copy recipe to clipboard"><span aria-hidden="true">⧉</span></button>
                <div className="html-recipe-area">{recipe}</div>
              </div>
            ) : (
              <div className="html-recipe-empty">
                <p>Click "Generate recipe" to build the AI prompt from your {zones.length} zone{zones.length !== 1 ? 's' : ''}.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: JSON response panel ─────────────────────────────────── */}
        <div className="html-recipe-right">
          <div className="html-recipe-panel">
            <div className="html-recipe-panel-header">
              <h3>JSON Response</h3>
            </div>

            <div className="html-recipe-json-wrapper">
              <button className="copy-btn" onClick={handleCopyJson} aria-label="Copy JSON to clipboard"><span aria-hidden="true">⧉</span></button>
              <textarea
                className={`json-input${validation?.valid === false ? ' has-error' : ''}`}
                value={jsonInput}
                onChange={e => handleJsonChange(e.target.value)}
                placeholder='Paste the AI response JSON here…'
                spellCheck={false}
              />
            </div>

            {validation?.valid === false && (
              <div className="validation-status invalid">
                <strong>
                  {validation.error ||
                    (validation.missingFields?.length > 0
                      ? `Missing ${validation.missingFields.length} required field${validation.missingFields.length !== 1 ? 's' : ''}`
                      : 'Invalid JSON')}
                </strong>
                {validation.missingFields?.length > 0 && (
                  <ul className="html-recipe-missing-fields">
                    {validation.missingFields.slice(0, 8).map(f => (
                      <li key={f}>{f}</li>
                    ))}
                    {validation.missingFields.length > 8 && (
                      <li>…and {validation.missingFields.length - 8} more</li>
                    )}
                  </ul>
                )}
              </div>
            )}
            {validation?.valid === true && (
              <div className="validation-status valid">
                JSON is valid — {validation.foundFields?.length ?? 0} fields found
                {validation.instanceCount > 0 && `, ${validation.instanceCount} slide instance${validation.instanceCount > 1 ? 's' : ''}`}
              </div>
            )}

            <div className="html-recipe-actions">
              <button className="btn btn-link" onClick={onBack}>
                <span aria-hidden="true">←</span> Back to template
              </button>
              <button
                className="btn btn-primary"
                onClick={handleApply}
                disabled={!validation?.valid || applying}
              >
                {applying ? 'Applying…' : <><span aria-hidden="true">→</span> Apply content</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI PoC Section */}
      <section style={{ marginTop: '40px', paddingTop: '40px', borderTop: '1px solid rgba(228, 228, 231, 0.1)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#f1f5f9' }}>
          AI PoC — Custom Prompt Test
        </h3>

        {/* Custom Prompt Input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#a1a1aa', marginBottom: '8px' }}>
            Custom Prompt
          </label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Enter a test prompt..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: '#f1f5f9',
              fontFamily: 'monospace',
              fontSize: '13px',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSendToAi}
          disabled={!customPrompt.trim() || aiLoading}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: aiLoading ? 'rgba(96, 165, 250, 0.4)' : 'linear-gradient(135deg, #60a5fa, #3b82f6)',
            color: '#fff',
            fontWeight: '600',
            fontSize: '14px',
            cursor: aiLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {aiLoading ? 'Sending...' : 'Send to AI'}
        </button>

        {/* AI Response */}
        <div style={{ marginTop: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#a1a1aa', marginBottom: '8px' }}>
            AI Response
          </label>
          <textarea
            value={aiResponse}
            readOnly
            placeholder="Response will appear here..."
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              background: 'rgba(15, 23, 42, 0.4)',
              color: '#a1a1aa',
              fontFamily: 'monospace',
              fontSize: '12px',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Debug Log */}
        <div style={{ marginTop: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#a1a1aa', marginBottom: '8px' }}>
            Debug Log
          </label>
          <pre
            style={{
              width: '100%',
              maxHeight: '150px',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              background: 'rgba(15, 23, 42, 0.5)',
              color: '#71717a',
              fontFamily: 'monospace',
              fontSize: '11px',
              overflow: 'auto',
              margin: 0,
            }}
          >
            {debugLog.length === 0 ? '(no activity yet)' : debugLog.join('\n')}
          </pre>
        </div>
      </section>
    </div>
  )
}
