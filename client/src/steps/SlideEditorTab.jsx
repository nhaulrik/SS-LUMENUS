import { useState, useEffect } from 'react'
import styles from './SlideEditorTab.module.css'
import SlideEditorTree from '../components/SlideEditorTree'
import SlideEditor from '../components/SlideEditor'
import SlidePreviewEditor from '../components/SlidePreviewEditor'
import SaveDialog from '../components/SaveDialog'

/**
 * SlideEditorTab
 *
 * Main editor workspace: three-column layout with navigation tree,
 * Monaco editor, and preview iframe.
 */
export default function SlideEditorTab({ projectName, setToast }) {
  const [exports, setExports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Currently open slide
  const [openSlide, setOpenSlide] = useState(null) // { flowId, exportId, slideFile, slideIndex }
  const [slideHtml, setSlideHtml] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  // Selected slides for batch export
  const [selectedSlides, setSelectedSlides] = useState(new Set())

  // Save dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  // Unsaved changes warning
  const [unsavedWarning, setUnsavedWarning] = useState(null)

  // Load all exports on mount
  useEffect(() => {
    const loadExports = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/projects/${projectName}`)
        if (!res.ok) throw new Error('Failed to load project')
        const data = await res.json()
        const flows = data.project?.flows || []

        // Fetch exports for all flows
        const exportsResults = await Promise.all(
          flows.map(async (flow) => {
            try {
              const r = await fetch(`/api/projects/${projectName}/flows/${flow.flowId}/exports`)
              if (!r.ok) return []
              const d = await r.json()
              const list = d.exports || d || []
              return list.map((exp) => ({
                flowId: flow.flowId,
                flowName: flow.name || flow.flowId,
                exportId: exp.exportId,
                exportNumber: exp.exportNumber ?? 1,
                slideCount: exp.slideCount ?? exp.slides?.length ?? 0,
                createdAt: exp.createdAt,
                slides: exp.content?.slides || exp.slides || [],
              }))
            } catch {
              return []
            }
          })
        )

        setExports(exportsResults.flat())
        setError(null)
      } catch (err) {
        setError(err.message)
        setToast?.({ type: 'error', message: err.message })
      } finally {
        setLoading(false)
      }
    }

    loadExports()
  }, [projectName, setToast])

  // Load slide HTML when a slide is selected
  useEffect(() => {
    if (!openSlide) {
      setSlideHtml('')
      setIsDirty(false)
      return
    }

    const loadSlide = async () => {
      try {
        const { flowId, exportId, slideFile } = openSlide
        const res = await fetch(
          `/api/projects/${projectName}/flows/${flowId}/exports/${exportId}/slides/${slideFile}`
        )
        if (!res.ok) throw new Error('Failed to load slide')
        const html = await res.text()
        setSlideHtml(html)
        setIsDirty(false)
      } catch (err) {
        setToast?.({ type: 'error', message: err.message })
      }
    }

    loadSlide()
  }, [openSlide, projectName, setToast])

  const handleSelectSlide = (flowId, exportId, slideFile, slideIndex) => {
    if (isDirty) {
      setUnsavedWarning({
        action: 'selectSlide',
        payload: { flowId, exportId, slideFile, slideIndex },
      })
      return
    }
    setOpenSlide({ flowId, exportId, slideFile, slideIndex })
  }

  const handleEditorChange = (newHtml) => {
    setSlideHtml(newHtml)
    setIsDirty(true)
  }

  const handlePreviewEdit = (newHtml) => {
    setSlideHtml(newHtml)
    setIsDirty(true)
  }

  const handleToggleSlideSelection = (flowId, exportId, slideFile) => {
    const key = `${flowId}::${exportId}::${slideFile}`
    setSelectedSlides((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSaveClick = () => {
    if (!openSlide || !isDirty) return
    setShowSaveDialog(true)
  }

  const handleSaveConfirm = async (mode) => {
    if (!openSlide) return

    const { flowId, exportId, slideFile } = openSlide

    try {
      if (mode === 'patch') {
        // PATCH existing slide
        const res = await fetch(
          `/api/projects/${projectName}/flows/${flowId}/exports/${exportId}/slides/${slideFile}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html: slideHtml }),
          }
        )
        if (!res.ok) throw new Error('Failed to save slide')
        setToast?.({ type: 'success', message: 'Slide saved' })
      } else if (mode === 'fork') {
        // POST fork with selected slides
        const slidesToFork = Array.from(selectedSlides)
          .filter((key) => {
            const [fid, eid] = key.split('::')
            return fid === flowId && eid === exportId
          })
          .map((key) => key.split('::')[2])

        if (slidesToFork.length === 0) {
          setToast?.({ type: 'error', message: 'Select at least one slide to export' })
          return
        }

        const overrides = {}
        slidesToFork.forEach((sf) => {
          if (sf === slideFile) {
            overrides[sf] = slideHtml
          }
        })

        const res = await fetch(
          `/api/projects/${projectName}/flows/${flowId}/exports/${exportId}/fork`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slides: slidesToFork, overrides }),
          }
        )
        if (!res.ok) throw new Error('Failed to create export')
        const data = await res.json()
        setToast?.({
          type: 'success',
          message: `New export created (Export #${data.exportNumber})`,
        })
        setSelectedSlides(new Set())
        // Reload exports
        const projectRes = await fetch(`/api/projects/${projectName}`)
        if (projectRes.ok) {
          const projectData = await projectRes.json()
          const flows = projectData.project?.flows || []
          const exportsResults = await Promise.all(
            flows.map(async (flow) => {
              try {
                const r = await fetch(
                  `/api/projects/${projectName}/flows/${flow.flowId}/exports`
                )
                if (!r.ok) return []
                const d = await r.json()
                const list = d.exports || d || []
                return list.map((exp) => ({
                  flowId: flow.flowId,
                  flowName: flow.name || flow.flowId,
                  exportId: exp.exportId,
                  exportNumber: exp.exportNumber ?? 1,
                  slideCount: exp.slideCount ?? exp.slides?.length ?? 0,
                  createdAt: exp.createdAt,
                  slides: exp.content?.slides || exp.slides || [],
                }))
              } catch {
                return []
              }
            })
          )
          setExports(exportsResults.flat())
        }
      }

      setIsDirty(false)
      setShowSaveDialog(false)
    } catch (err) {
      setToast?.({ type: 'error', message: err.message })
    }
  }

  const handleExportSelected = async () => {
    if (selectedSlides.size === 0) return

    try {
      // Group selected slides by export
      const byExport = {}
      selectedSlides.forEach((key) => {
        const [flowId, exportId, slideFile] = key.split('::')
        if (!byExport[`${flowId}::${exportId}`]) {
          byExport[`${flowId}::${exportId}`] = { flowId, exportId, slides: [] }
        }
        byExport[`${flowId}::${exportId}`].slides.push(slideFile)
      })

      // For now, fork the first export with selected slides
      // In a more complex scenario, you might handle multiple exports
      const firstExport = Object.values(byExport)[0]
      if (!firstExport) return

      const { flowId, exportId, slides } = firstExport
      const overrides = {}

      // If current slide is being exported and is dirty, include its edits
      if (
        openSlide &&
        openSlide.flowId === flowId &&
        openSlide.exportId === exportId &&
        isDirty &&
        slides.includes(openSlide.slideFile)
      ) {
        overrides[openSlide.slideFile] = slideHtml
      }

      const res = await fetch(
        `/api/projects/${projectName}/flows/${flowId}/exports/${exportId}/fork`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slides, overrides }),
        }
      )

      if (!res.ok) throw new Error('Failed to create export')
      const data = await res.json()
      setToast?.({
        type: 'success',
        message: `New export created (Export #${data.exportNumber})`,
      })
      setSelectedSlides(new Set())

      // Reload exports
      const projectRes = await fetch(`/api/projects/${projectName}`)
      if (projectRes.ok) {
        const projectData = await projectRes.json()
        const flows = projectData.project?.flows || []
        const exportsResults = await Promise.all(
          flows.map(async (flow) => {
            try {
              const r = await fetch(
                `/api/projects/${projectName}/flows/${flow.flowId}/exports`
              )
              if (!r.ok) return []
              const d = await r.json()
              const list = d.exports || d || []
              return list.map((exp) => ({
                flowId: flow.flowId,
                flowName: flow.name || flow.flowId,
                exportId: exp.exportId,
                exportNumber: exp.exportNumber ?? 1,
                slideCount: exp.slideCount ?? exp.slides?.length ?? 0,
                createdAt: exp.createdAt,
                slides: exp.content?.slides || exp.slides || [],
              }))
            } catch {
              return []
            }
          })
        )
        setExports(exportsResults.flat())
      }
    } catch (err) {
      setToast?.({ type: 'error', message: err.message })
    }
  }

  const handleRenameSlide = async (flowId, exportId, slideFile, newTitle) => {
    const originalTitle = exports
      .find(exp => exp.flowId === flowId && exp.exportId === exportId)
      ?.slides.find(s => s.file === slideFile)?.title

    // Optimistic update: update local exports state immediately
    setExports(prev => prev.map(exp => {
      if (exp.flowId !== flowId || exp.exportId !== exportId) return exp
      return {
        ...exp,
        slides: exp.slides.map(s =>
          s.file === slideFile ? { ...s, title: newTitle } : s
        )
      }
    }))

    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectName)}/flows/${encodeURIComponent(flowId)}/exports/${encodeURIComponent(exportId)}/slides/${encodeURIComponent(slideFile)}/title`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle })
        }
      )
      if (!res.ok) throw new Error(`Server error ${res.status}`)
    } catch (err) {
      console.error('Failed to rename slide:', err)
      // Rollback optimistic update on failure
      setExports(prev => prev.map(exp => {
        if (exp.flowId !== flowId || exp.exportId !== exportId) return exp
        return {
          ...exp,
          slides: exp.slides.map(s =>
            s.file === slideFile ? { ...s, title: originalTitle } : s
          )
        }
      }))
    }
  }

  const handleUnsavedWarningConfirm = (save) => {
    if (save) {
      setShowSaveDialog(true)
    } else {
      // Proceed with action
      if (unsavedWarning?.action === 'selectSlide') {
        const { flowId, exportId, slideFile, slideIndex } = unsavedWarning.payload
        setOpenSlide({ flowId, exportId, slideFile, slideIndex })
      } else if (unsavedWarning?.action === 'exportSelected') {
        handleExportSelected()
      }
      setUnsavedWarning(null)
    }
  }

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading exports…</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className={styles.section}>
        <div className={styles.errorContainer}>
          <p>Error: {error}</p>
        </div>
      </section>
    )
  }

  return (
    <div className={styles.editorContainer}>
       {/* Navigation Tree */}
       <div className={styles.navPanel}>
         <SlideEditorTree
           exports={exports}
           openSlide={openSlide}
           selectedSlides={selectedSlides}
           onSelectSlide={handleSelectSlide}
           onToggleSlideSelection={handleToggleSlideSelection}
           onRenameSlide={handleRenameSlide}
           isDirty={isDirty}
         />

        {/* Save & Export buttons */}
        <div className={styles.navFooter}>
          <button
            className={styles.saveButton}
            disabled={!isDirty || !openSlide}
            onClick={handleSaveClick}
          >
            Save
          </button>
          <button
            className={styles.exportButton}
            disabled={selectedSlides.size === 0}
            onClick={() => {
              if (isDirty) {
                setUnsavedWarning({
                  action: 'exportSelected',
                  payload: null,
                })
              } else {
                handleExportSelected()
              }
            }}
          >
            Export selected ({selectedSlides.size})
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className={styles.editorPanel}>
        {!openSlide ? (
          <div className={styles.emptyState}>
            <p>Select a slide from the export tree to begin editing</p>
          </div>
        ) : (
          <SlideEditor html={slideHtml} onChange={handleEditorChange} />
        )}
      </div>

      {/* Preview */}
      <div className={styles.previewPanel}>
        {!openSlide ? (
          <div className={styles.emptyState}>
            <p>Preview</p>
          </div>
        ) : (
          <SlidePreviewEditor
            html={slideHtml}
            onEdit={handlePreviewEdit}
            projectName={projectName}
            flowId={openSlide.flowId}
            exportId={openSlide.exportId}
            slideFile={openSlide.slideFile}
          />
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <SaveDialog
          onPatch={() => handleSaveConfirm('patch')}
          onFork={() => handleSaveConfirm('fork')}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}

      {/* Unsaved Changes Warning */}
      {unsavedWarning && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Unsaved Changes</h3>
            <p>You have unsaved changes. Save them before leaving?</p>
            <div className={styles.modalButtons}>
              <button
                className={styles.modalButtonPrimary}
                onClick={() => handleUnsavedWarningConfirm(true)}
              >
                Save
              </button>
              <button
                className={styles.modalButtonSecondary}
                onClick={() => handleUnsavedWarningConfirm(false)}
              >
                Discard
              </button>
              <button
                className={styles.modalButtonCancel}
                onClick={() => setUnsavedWarning(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
