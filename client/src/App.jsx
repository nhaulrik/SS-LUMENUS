import { useState, useCallback, useEffect, useRef } from 'react'
import Toast            from './components/Toast.jsx'
import FlowSelectStep   from './steps/FlowSelectStep.jsx'
import UploadStep       from './steps/UploadStep.jsx'
import HtmlUploadStep   from './steps/HtmlUploadStep.jsx'
import HtmlRecipeStep   from './steps/HtmlRecipeStep.jsx'
import HtmlPreviewStep  from './steps/HtmlPreviewStep.jsx'
import TagStep          from './steps/TagStep.jsx'
import RecipeStep       from './steps/RecipeStep.jsx'
import PreviewStep      from './steps/PreviewStep.jsx'
import { mergeTagsWithSlides } from './utils/tagUtils.js'

// All steps including the shared entry points
const ALL_STEPS  = ['flow-select', 'upload', 'html-upload', 'html-recipe', 'html-preview', 'tag', 'recipe', 'preview']

export default function App() {
  // ── Step navigation ────────────────────────────────────────────
  const [step,    setStep]    = useState('flow-select')
  const [animDir, setAnimDir] = useState('forward')

  const navigateTo = useCallback((newStep) => {
    const curr = ALL_STEPS.indexOf(step)
    const next = ALL_STEPS.indexOf(newStep)
    setAnimDir(next >= curr ? 'forward' : 'backward')
    setStep(newStep)
  }, [step])

  const stepAnimClass = `step-content step-content-enter-${animDir === 'forward' ? 'right' : 'left'}`

  // ── Flow selection ─────────────────────────────────────────────
  const [activeFlow, setActiveFlow] = useState(null) // 'pptx' | 'html'

  const handleSelectFlow = useCallback((flow) => {
    setActiveFlow(flow)
    if (flow === 'pptx') navigateTo('upload')
    if (flow === 'html') navigateTo('html-upload')
  }, [navigateTo])

  const handleBackToFlowSelect = useCallback(() => {
    setActiveFlow(null)
    setHtmlUploadSession(null)
    setHtmlProject(null)
    setHtmlApplied(null)
    navigateTo('flow-select')
  }, [navigateTo])

  // ── HTML flow state ────────────────────────────────────────────
  // htmlUploadSession persists the upload/tree state so back-navigation
  // from recipe or preview restores the tree without re-uploading.
  const [htmlUploadSession, setHtmlUploadSession] = useState(null)
  // { templateId, fileName, slideCount, trees, selections, previewHtml, rawHtml, projectName }

  const [htmlProject,  setHtmlProject]  = useState(null)  // { chainId, projectName, zones, templatePath }
  const [htmlApplied,  setHtmlApplied]  = useState(null)  // { outputFile, previewHtml, roundId }

  const handleHtmlProjectCreated = useCallback((project) => {
    setHtmlProject(project)
    navigateTo('html-recipe')
  }, [navigateTo])

  const handleHtmlApplied = useCallback((result) => {
    setHtmlApplied(result)
    navigateTo('html-preview')
  }, [navigateTo])

  const handleBackToHtmlRecipe = useCallback(() => {
    setHtmlApplied(null)
    navigateTo('html-recipe')
  }, [navigateTo])

  // ── PPTX flow: Template data ───────────────────────────────────
  const [templateFile, setTemplateFile] = useState(null)
  const [slides,       setSlides]       = useState([])

  // ── PPTX flow: Tags ────────────────────────────────────────────
  const [tags,             setTags]             = useState([])
  const [repeatableSlides, setRepeatableSlides] = useState([])
  const [propagations,     setPropagations]     = useState([])

  // ── PPTX flow: Patch persistence ──────────────────────────────
  const [patches,      setPatches]      = useState([])
  const [currentPatch, setCurrentPatch] = useState(null)
  const [patchName,    setPatchName]    = useState('')
  const [globalPrompt, setGlobalPrompt] = useState('')
  const lastSavedPatchRef = useRef(null)
  const saveTimeoutRef    = useRef(null)

  // ── PPTX flow: Chain state ─────────────────────────────────────
  const [chainId,             setChainId]             = useState(null)
  const [chainRounds,         setChainRounds]         = useState([])
  const [currentRoundId,      setCurrentRoundId]      = useState(null)
  const [restoredBaseRoundId, setRestoredBaseRoundId] = useState(null)

  // ── PPTX flow: Recipe / generation ────────────────────────────
  const [recipe,             setRecipe]             = useState('')
  const [jsonInput,          setJsonInput]          = useState('')
  const [validation,         setValidation]         = useState(null)
  const [previewData,        setPreviewData]        = useState([])
  const [selectedPreviewIdx, setSelectedPreviewIdx] = useState(0)
  const [tagPreviewIdx,      setTagPreviewIdx]      = useState(0)

  // ── Global toast notification ──────────────────────────────────
  const [toast, setToast] = useState(null)

  // ── canNavigateTo guard ───────────────────────────────────────
  const canNavigateTo = useCallback((s) => {
    if (s === 'flow-select')  return true
    // PPTX flow
    if (s === 'upload')       return activeFlow === 'pptx'
    if (s === 'tag')          return !!(templateFile)
    if (s === 'recipe')       return !!(templateFile && tags.length > 0)
    if (s === 'preview')      return !!(templateFile && tags.length > 0 && jsonInput && validation?.valid)
    // HTML flow
    if (s === 'html-upload')  return activeFlow === 'html'
    if (s === 'html-recipe')  return !!(htmlProject)
    if (s === 'html-preview') return !!(htmlProject && htmlApplied)
    return false
  }, [activeFlow, templateFile, tags.length, jsonInput, validation, htmlProject, htmlApplied])

  // ── Load patches on mount ──────────────────────────────────────
  useEffect(() => {
    fetch('/api/patches')
      .then(res => res.ok ? res.json() : [])
      .then(data => setPatches(data || []))
      .catch(() => setPatches([]))
  }, [])

  // ── Patch save helpers ─────────────────────────────────────────
  const savePatchToServer = useCallback(async (patch) => {
    try {
      await fetch('/api/patches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patch })
      })
    } catch { /* non-critical */ }
  }, [])

  const triggerSave = useCallback((newTags, newRepeatableSlides, newGlobalPrompt, newPropagations) => {
    if (!currentPatch) return

    const promptToSave       = newGlobalPrompt  !== undefined ? newGlobalPrompt  : globalPrompt
    const propagationsToSave = newPropagations  !== undefined ? newPropagations  : propagations

    clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      const snapshot = JSON.stringify({ tags: newTags, repeatableSlides: newRepeatableSlides, globalPrompt: promptToSave, propagations: propagationsToSave })
      if (snapshot === lastSavedPatchRef.current) return

      lastSavedPatchRef.current = snapshot
      const updated = patches.map(p =>
        p.id === currentPatch
          ? { ...p, tags: newTags, repeatableSlides: newRepeatableSlides, globalPrompt: promptToSave, propagations: propagationsToSave, updatedAt: new Date().toISOString() }
          : p
      )
      setPatches(updated)
      const patchToSave = updated.find(p => p.id === currentPatch)
      if (patchToSave) savePatchToServer(patchToSave)
    }, 1000)
  }, [currentPatch, patches, globalPrompt, propagations, savePatchToServer])

  // ── Auto-load / create patch when entering Tag step ───────────
  useEffect(() => {
    if (step !== 'tag' || slides.length === 0) return
    if (chainId) return

    const existing = patches.find(p => p.pptxFile === templateFile?.fileName)
    if (existing) {
      const merged = mergeTagsWithSlides(existing.tags || [], slides)
      setTags(merged)
      setRepeatableSlides(existing.repeatableSlides || [])
      setPropagations(existing.propagations || [])
      setCurrentPatch(existing.id)
      setPatchName(existing.name)
      setGlobalPrompt(existing.globalPrompt || '')
      lastSavedPatchRef.current = JSON.stringify({ tags: merged, repeatableSlides: existing.repeatableSlides || [], globalPrompt: existing.globalPrompt || '', propagations: existing.propagations || [] })
      return
    }

    const autoPatchName = templateFile?.fileName
      ? templateFile.fileName.replace('.pptx', '') + '_auto'
      : 'auto_patch'
    const newPatch = {
      id: Date.now(),
      name: autoPatchName,
      pptxFile: templateFile?.fileName || '',
      createdAt: new Date().toISOString(),
      tags: [],
      repeatableSlides: [],
      globalPrompt: '',
      propagations: []
    }
    setPatches(prev => [...prev, newPatch])
    setCurrentPatch(newPatch.id)
    setPatchName(autoPatchName)
    setPropagations([])
    savePatchToServer(newPatch)
    lastSavedPatchRef.current = JSON.stringify({ tags: [], repeatableSlides: [], globalPrompt: '', propagations: [] })
  }, [step, slides, templateFile, patches, chainId, savePatchToServer])

  // ── Auto-match patch when a PPTX is loaded ────────────────────
  useEffect(() => {
    if (!templateFile?.fileName || patches.length === 0 || slides.length === 0) return
    if (chainId) return

    const match = patches.find(p => p.pptxFile === templateFile.fileName)
    if (!match) return

    const merged = mergeTagsWithSlides(match.tags || [], slides)
    setTags(merged)
    setRepeatableSlides(match.repeatableSlides || [])
    setPropagations(match.propagations || [])
    setCurrentPatch(match.id)
    setPatchName(match.name)
    setGlobalPrompt(match.globalPrompt || '')
    lastSavedPatchRef.current = JSON.stringify({ tags: merged, repeatableSlides: match.repeatableSlides || [], globalPrompt: match.globalPrompt || '', propagations: match.propagations || [] })
  }, [templateFile, patches, slides, chainId])

  // ── Apply a saved patch ────────────────────────────────────────
  const handleApplyPatch = useCallback((patchId) => {
    const patch = patches.find(p => p.id === patchId)
    if (!patch || slides.length === 0) return

    const merged = mergeTagsWithSlides(patch.tags || [], slides)
    setTags(merged)
    setRepeatableSlides(patch.repeatableSlides || [])
    setPropagations(patch.propagations || [])
    setCurrentPatch(patch.id)
    setPatchName(patch.name)
    setGlobalPrompt(patch.globalPrompt || '')
    lastSavedPatchRef.current = JSON.stringify({ tags: merged, repeatableSlides: patch.repeatableSlides || [], globalPrompt: patch.globalPrompt || '', propagations: patch.propagations || [] })
  }, [patches, slides])

  // ── Delete a patch ─────────────────────────────────────────────
  const handleDeletePatch = useCallback(async () => {
    if (!currentPatch) return
    try {
      await fetch(`/api/patches/${currentPatch}`, { method: 'DELETE' })
    } catch { /* best-effort */ }
    setPatches(prev => prev.filter(p => p.id !== currentPatch))
    setCurrentPatch(null)
    setPatchName('')
    setGlobalPrompt('')
    setPropagations([])
  }, [currentPatch])

  // ── Propagation config ─────────────────────────────────────────
  const handleSavePropagation = useCallback((key, config) => {
    setPropagations(prev => {
      const next = config
        ? [...prev.filter(p => p.key !== key), { key, ...config }]
        : prev.filter(p => p.key !== key)

      const tagsWithKey = tags.filter(t => t.key === key)
      const sourceTag = tagsWithKey.find(t => t.maxChars != null) ?? tagsWithKey[0]

      if (config?.mode === 'non-unique') {
        if (sourceTag) {
          const newTags = tags.map(tag =>
            tag.key === key
              ? { ...tag, hint: sourceTag.hint, maxChars: sourceTag.maxChars }
              : tag
          )
          setTags(newTags)
          triggerSave(newTags, repeatableSlides, undefined, next)
          return next
        }
      }

      if (config?.mode === 'unique') {
        if (sourceTag?.maxChars != null) {
          const newTags = tags.map(tag =>
            tag.key === key
              ? { ...tag, maxChars: sourceTag.maxChars }
              : tag
          )
          setTags(newTags)
          triggerSave(newTags, repeatableSlides, undefined, next)
          return next
        }
      }

      triggerSave(tags, repeatableSlides, undefined, next)
      return next
    })
  }, [tags, repeatableSlides, triggerSave])

  // ── Merge elements from other slides into one shared key ───────
  const handleMergeKey = useCallback((sourceTag, targetElementIds) => {
    const newTags = tags.map(tag =>
      targetElementIds.includes(tag.elementId)
        ? { ...tag, key: sourceTag.key, maxChars: sourceTag.maxChars }
        : tag
    )
    setTags(newTags)
    triggerSave(newTags, repeatableSlides, undefined, propagations)
  }, [tags, repeatableSlides, propagations, triggerSave])

  // ── Rename a key across all slides ────────────────────────────
  const handleRenameKeyAllSlides = useCallback((oldKey, newKey) => {
    const newTags = tags.map(tag => tag.key === oldKey ? { ...tag, key: newKey } : tag)
    const newPropagations = propagations
      .map(p => p.key       === oldKey ? { ...p, key:       newKey } : p)
      .map(p => p.linkedKey === oldKey ? { ...p, linkedKey: newKey } : p)
    setTags(newTags)
    setPropagations(newPropagations)
    triggerSave(newTags, repeatableSlides, undefined, newPropagations)
  }, [tags, propagations, repeatableSlides, triggerSave])

  // ── File upload (PPTX flow) ────────────────────────────────────
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0] || e.dataTransfer?.files?.[0]
    if (!file || !file.name.endsWith('.pptx')) {
      setToast({ message: 'Please upload a .pptx file', type: 'error' })
      return
    }

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const base64 = evt.target.result.split(',')[1]
        const res = await fetch('/api/upload-pptx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: base64, fileName: file.name })
        })
        if (!res.ok) throw new Error(`Upload failed (${res.status})`)
        const result = await res.json()
        if (!result.ok) throw new Error(result.error || 'Failed to upload')
        setTemplateFile(result)
        setSlides(result.slides)
        navigateTo('tag')
      } catch (err) {
        setToast({ message: err.message, type: 'error' })
      }
    }
    reader.readAsDataURL(file)
  }, [navigateTo])

  // ── Generate recipe ────────────────────────────────────────────
  const handleGenerateRecipe = useCallback(async () => {
    try {
      const res = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags, repeatableSlides, globalPrompt, propagations })
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const result = await res.json()
      setRecipe(result.recipe)
      navigateTo('recipe')
    } catch (err) {
      setToast({ message: 'Failed to generate recipe: ' + err.message, type: 'error' })
    }
  }, [tags, repeatableSlides, globalPrompt, propagations, navigateTo])

  // ── Generate preview ───────────────────────────────────────────
  const generatePreview = useCallback(async () => {
    try {
      const jsonData = JSON.parse(jsonInput)
      const res = await fetch('/api/generate-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templatePath: templateFile.filePath, tags, jsonData, repeatableSlides })
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const result = await res.json()
      if (!result.ok) throw new Error(result.error || 'Failed to generate')
      setPreviewData(result.previewData)
      navigateTo('preview')
    } catch (err) {
      setToast({ message: 'Generate failed: ' + err.message, type: 'error' })
    }
  }, [templateFile, tags, jsonInput, repeatableSlides, navigateTo])

  // ── Apply patch round (PPTX flow) ─────────────────────────────
  const applyPatchAndContinue = useCallback(async () => {
    try {
      const jsonData = JSON.parse(jsonInput)

      let activeChainId = chainId
      if (!activeChainId) {
        const res = await fetch('/api/patch-chains', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templatePath: templateFile.filePath, pptxFileName: templateFile.fileName })
        })
        if (!res.ok) throw new Error(`Create chain failed (${res.status})`)
        const data = await res.json()
        if (!data.ok) throw new Error(data.error)
        activeChainId = data.chainId
        setChainId(activeChainId)
      }

      const applyRes = await fetch(`/api/patch-chains/${activeChainId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags, jsonData, repeatableSlides, propagations, baseRoundId: restoredBaseRoundId })
      })
      if (!applyRes.ok) throw new Error(`Apply failed (${applyRes.status})`)
      const applyResult = await applyRes.json()
      if (!applyResult.ok) throw new Error(applyResult.error)

      const parseRes = await fetch('/api/parse-pptx-from-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: applyResult.nextBasePath })
      })
      if (!parseRes.ok) throw new Error(`Parse failed (${parseRes.status})`)
      const parseResult = await parseRes.json()
      if (!parseResult.ok) throw new Error(parseResult.error)

      const elemById = {}
      slides.forEach(s => s.elements.forEach(e => { elemById[e.id] = e }))
      const enrichedTags = tags.map(t =>
        t.shapeName ? t : { ...t, shapeName: elemById[t.elementId]?.shapeName ?? null }
      )

      const byShapeKey = {}
      enrichedTags.forEach(t => {
        if (!t.shapeName) return
        const slideElems = (slides.find(s => s.index === t.slideIndex)?.elements || [])
        const elemIdx   = slideElems.findIndex(e => e.id === t.elementId)
        const key       = t.slideIndex + ':' + t.shapeName + ':' + elemIdx
        byShapeKey[key] = t
      })

      const cloneMap = {}
      ;(applyResult.previewData || []).forEach(p => {
        if (p.templateSlideIndex && p.instanceIndex !== null) cloneMap[p.slideNumber] = p.templateSlideIndex
      })

      const synthetic = []
      const covered   = new Set()
      parseResult.slides.forEach(slide => {
        const tplIdx = cloneMap[slide.index]
        if (!tplIdx) return
        slide.elements.forEach((elem, elemIdx) => {
          if (covered.has(elem.id)) return
          if (!elem.shapeName) return
          const shapeKey = tplIdx + ':' + elem.shapeName + ':' + elemIdx
          const src = byShapeKey[shapeKey]
          if (!src) return
          synthetic.push({ ...src, elementId: elem.id, slideIndex: slide.index, autoGenerate: false, originalText: elem.text ?? src.originalText })
          covered.add(elem.id)
        })
      })

      const mergedTags = mergeTagsWithSlides(enrichedTags, parseResult.slides)
        .map(t => ({ ...t, autoGenerate: false }))
      const filteredMerged = mergedTags.filter(t => !covered.has(t.elementId))
      const correctedTags = [...filteredMerged, ...synthetic]

      setTemplateFile({ filePath: parseResult.filePath, slides: parseResult.slides, fileName: templateFile.fileName })
      setSlides(parseResult.slides)
      setTags(correctedTags)
      setRepeatableSlides([])
      setRecipe('')
      setJsonInput('')
      setValidation(null)
      setPreviewData(applyResult.previewData)
      setTagPreviewIdx(0)
      setRestoredBaseRoundId(null)

      setChainRounds(prev => {
        const without = prev.filter(r => r.id !== applyResult.round.id)
        return [...without, applyResult.round]
      })
      setCurrentRoundId(applyResult.roundId)
      navigateTo('tag')
    } catch (err) {
      setToast({ message: 'Patch failed: ' + err.message, type: 'error' })
    }
  }, [chainId, templateFile, tags, jsonInput, repeatableSlides, propagations, restoredBaseRoundId, navigateTo])

  // ── Restore a previous patch round ────────────────────────────
  const handleRestoreRound = useCallback(async (roundId) => {
    if (!chainId) return
    try {
      const res = await fetch(`/api/patch-chains/${chainId}/patches/${roundId}`)
      if (!res.ok) throw new Error(`Fetch round failed (${res.status})`)
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)

      const { round, slides: roundSlides, filePath } = data
      const mergedTags = mergeTagsWithSlides(round.tags || [], roundSlides)

      setTemplateFile(prev => ({ ...prev, filePath, slides: roundSlides }))
      setSlides(roundSlides)
      setTags(mergedTags)
      setPropagations(round.propagations || [])
      setRepeatableSlides([])
      setRecipe('')
      setJsonInput('')
      setValidation(null)
      setRestoredBaseRoundId(roundId)
      setCurrentRoundId(roundId)

      const restoredPreview = roundSlides.map((s, idx) => ({
        slideNumber:   idx + 1,
        instanceIndex: null,
        content:       null,
        elements:      s.elements,
        background:    s.background,
        sampleText:    []
      }))
      setPreviewData(restoredPreview)
      setTagPreviewIdx(0)
      setToast({ message: `Restored to "${round.name}"`, type: 'success' })
    } catch (err) {
      setToast({ message: 'Restore failed: ' + err.message, type: 'error' })
    }
  }, [chainId])

  // ── Rename a chain round ───────────────────────────────────────
  const handleRenameRound = useCallback(async (roundId, name) => {
    if (!chainId) return
    try {
      const res = await fetch(`/api/patch-chains/${chainId}/patches/${roundId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      if (!res.ok) throw new Error('Rename failed')
      setChainRounds(prev => prev.map(r => r.id === roundId ? { ...r, name } : r))
    } catch { /* best-effort */ }
  }, [chainId])

  // ── Debug context ──────────────────────────────────────────────
  const debugContext = {
    timestamp:        new Date().toISOString(),
    step,
    activeFlow,
    currentPatch,
    patchName,
    chainId,
    currentRoundId,
    restoredBaseRoundId,
    globalPrompt:     globalPrompt || null,
    slides: slides.map(s => ({ index: s.index, width: s.width, height: s.height, elementCount: s.elements?.length ?? 0 })),
    tags,
    repeatableSlides,
    propagations,
    validation,
    recipe:           recipe   ? recipe.substring(0, 2000)   + (recipe.length   > 2000 ? '...[truncated]' : '') : null,
    jsonInput:        jsonInput ? jsonInput.substring(0, 2000) + (jsonInput.length > 2000 ? '...[truncated]' : '') : null,
    chainRounds:      chainRounds.map(r => ({ id: r.id, name: r.name, status: r.status, appliedAt: r.appliedAt, outputFile: r.outputFile })),
    previewDataCount: previewData?.length ?? 0,
    htmlProject:      htmlProject ? { chainId: htmlProject.chainId, projectName: htmlProject.projectName, zoneCount: htmlProject.zones?.length } : null,
  }

  const sharedProps = { step, canNavigateTo, navigateTo, stepAnimClass, debugContext }

  // ── Step routing ───────────────────────────────────────────────

  if (step === 'flow-select') {
    return (
      <>
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <FlowSelectStep
          onSelectFlow={handleSelectFlow}
          debugContext={debugContext}
        />
      </>
    )
  }

  if (step === 'html-upload') {
    return (
      <>
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <HtmlUploadStep
          {...sharedProps}
          initialSession={htmlUploadSession}
          onSessionChange={setHtmlUploadSession}
          onProjectCreated={handleHtmlProjectCreated}
          onBack={handleBackToFlowSelect}
          setToast={setToast}
        />
      </>
    )
  }

  if (step === 'html-recipe' && htmlProject) {
    return (
      <>
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <HtmlRecipeStep
          project={htmlProject}
          step={step}
          canNavigateTo={canNavigateTo}
          navigateTo={navigateTo}
          onBack={() => navigateTo('html-upload')}
          onApplied={handleHtmlApplied}
          setToast={setToast}
          debugContext={debugContext}
        />
      </>
    )
  }

  if (step === 'html-preview' && htmlProject && htmlApplied) {
    return (
      <>
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <HtmlPreviewStep
          project={htmlProject}
          applied={htmlApplied}
          step={step}
          canNavigateTo={canNavigateTo}
          navigateTo={navigateTo}
          onBack={handleBackToHtmlRecipe}
          onStartNew={handleBackToFlowSelect}
          setToast={setToast}
          debugContext={debugContext}
        />
      </>
    )
  }

  if (step === 'upload') {
    return (
      <>
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <UploadStep
          {...sharedProps}
          templateFile={templateFile}
          handleFileUpload={handleFileUpload}
          onBack={handleBackToFlowSelect}
        />
      </>
    )
  }

  if (step === 'tag') {
    return (
      <>
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <TagStep
          {...sharedProps}
          slides={slides}
          tags={tags}
          setTags={setTags}
          repeatableSlides={repeatableSlides}
          setRepeatableSlides={setRepeatableSlides}
          propagations={propagations}
          onSavePropagation={handleSavePropagation}
          onRenameKeyAllSlides={handleRenameKeyAllSlides}
          onMergeKey={handleMergeKey}
          patches={patches}
          currentPatch={currentPatch}
          patchName={patchName}
          setPatchName={setPatchName}
          globalPrompt={globalPrompt}
          setGlobalPrompt={setGlobalPrompt}
          triggerSave={triggerSave}
          onApplyPatch={handleApplyPatch}
          onDeletePatch={handleDeletePatch}
          onGenerateRecipe={handleGenerateRecipe}
          setToast={setToast}
          chainId={chainId}
          chainRounds={chainRounds}
          currentRoundId={currentRoundId}
          onRestoreRound={handleRestoreRound}
          onRenameRound={handleRenameRound}
          previewData={previewData}
        />
      </>
    )
  }

  if (step === 'recipe') {
    return (
      <>
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <RecipeStep
          {...sharedProps}
          recipe={recipe}
          jsonInput={jsonInput}
          setJsonInput={setJsonInput}
          validation={validation}
          setValidation={setValidation}
          tags={tags}
          repeatableSlides={repeatableSlides}
          propagations={propagations}
          generatePreview={generatePreview}
          setToast={setToast}
        />
      </>
    )
  }

  if (step === 'preview') {
    return (
      <>
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <PreviewStep
          {...sharedProps}
          previewData={previewData}
          selectedPreviewIdx={selectedPreviewIdx}
          setSelectedPreviewIdx={setSelectedPreviewIdx}
          applyPatchAndContinue={applyPatchAndContinue}
        />
      </>
    )
  }

  return null
}
