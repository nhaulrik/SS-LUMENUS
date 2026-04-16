# Implementation Guide: Preview Step & Metadata Modal

This document provides detailed implementation guidance for the preview step redesign and metadata modal component.

---

## Overview

The preview step is the final stage before saving. Currently, it has 3 buttons. We're replacing them with a cleaner two-button design that triggers a metadata assignment workflow.

### Current Preview Step (HtmlPreviewStep.jsx)
```
User reviews slides → clicks "Download HTML" → single file saved
```

### New Preview Step
```
User reviews slides → clicks "Generate More Content" or "Package & Publish" → metadata modal → save/download
```

---

## Component Architecture

```
HtmlPreviewStep (existing)
├── Preview iframe (existing)
├── Slide navigation (existing)
└── Actions (MODIFIED)
    ├── "← Back to recipe" (existing)
    ├── "Generate More Content" (NEW)
    └── "Package & Publish" (NEW)

MetadataModal (NEW)
├── Header with slide counter
├── Form fields
│   ├── slideId (text input)
│   ├── name (text input)
│   ├── type (dropdown)
│   ├── parentSlideId (dropdown, conditional)
│   └── customMetadata (dynamic key-value pairs)
├── Navigation
│   ├── Previous button
│   ├── Slide counter
│   └── Next button
└── Action
    └── "Save & Continue" button
```

---

## Step 1: Modify HtmlPreviewStep.jsx

### Current Code Structure
```javascript
export default function HtmlPreviewStep({
  project,      // { chainId, projectName, zones }
  applied,      // { outputFile, previewHtml, roundId, slideCount }
  step,
  canNavigateTo,
  navigateTo,
  onBack,       // () => void
  onStartNew,   // () => void
  setToast,
  debugContext,
}) {
  // ... preview scaling logic
  // ... slide navigation logic
  
  const handleDownload = useCallback(() => {
    const url = `/api/html-flow/download/${chainId}/${outputFile}`
    const a = document.createElement('a')
    a.href = url
    a.download = outputFile
    a.click()
  }, [chainId, outputFile])
  
  return (
    // ... preview + nav + actions
  )
}
```

### Changes Required

**1. Add state for metadata modal:**
```javascript
const [showMetadataModal, setShowMetadataModal] = useState(false)
const [metadataAction, setMetadataAction] = useState(null) // 'continue' or 'publish'
```

**2. Replace handleDownload and button actions:**
```javascript
const handleGenerateMore = useCallback(() => {
  setMetadataAction('continue')
  setShowMetadataModal(true)
}, [])

const handlePackagePublish = useCallback(() => {
  setMetadataAction('publish')
  setShowMetadataModal(true)
}, [])

const handleMetadataComplete = useCallback(async (slides) => {
  // slides = array of slide metadata from modal
  try {
    const response = await fetch('/api/html-flow/save-iteration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chainId,
        projectName,
        projectId: project.projectId || null,
        action: metadataAction === 'continue' ? 'save-and-continue' : 'save-and-publish',
        slides,
      }),
    })
    
    const result = await response.json()
    
    if (!result.ok) {
      setToast({ type: 'error', message: result.error })
      return
    }
    
    if (metadataAction === 'continue') {
      // Store projectId in session, return to flow selector
      sessionStorage.setItem('projectId', result.projectId)
      onStartNew() // Navigate back to flow selector
    } else {
      // Show download dialog
      showDownloadDialog(result)
    }
  } catch (err) {
    setToast({ type: 'error', message: err.message })
  }
}, [chainId, projectName, project.projectId, metadataAction, setToast, onStartNew])
```

**3. Replace action buttons:**
```javascript
<div className="html-preview-step-actions">
  <button className="btn btn-link" onClick={onBack}>
    <span aria-hidden="true">←</span> Back to recipe
  </button>
  <div className="html-preview-step-right-actions">
    <button 
      className="btn btn-secondary" 
      onClick={handleGenerateMore}
    >
      Generate more content
    </button>
    <button 
      className="btn btn-primary" 
      onClick={handlePackagePublish}
    >
      Package & Publish
    </button>
  </div>
</div>

{showMetadataModal && (
  <MetadataModal
    slideCount={slideCount}
    onComplete={handleMetadataComplete}
    onCancel={() => setShowMetadataModal(false)}
    existingSlides={project.existingSlides || []} // For parent dropdown
  />
)}
```

**4. Add download dialog helper:**
```javascript
const showDownloadDialog = useCallback((result) => {
  const downloadUrl = result.downloadUrl
  const message = `
    Project packaged successfully!
    
    • ${result.slideCount} slides
    • Interactive web app generated
    
    [Download ZIP] [Close]
  `
  // Could be a modal or toast with action
  // For now, trigger download directly
  if (downloadUrl) {
    window.location.href = downloadUrl
  }
  setToast({ 
    type: 'success', 
    message: 'Project packaged! Download started.' 
  })
  // Optional: clear session and return to flow selector after delay
  setTimeout(() => onStartNew(), 2000)
}, [setToast, onStartNew])
```

---

## Step 2: Create MetadataModal Component

Create `client/src/components/MetadataModal.jsx`:

```javascript
import { useState, useCallback, useMemo } from 'react'

export default function MetadataModal({
  slideCount,           // Total number of slides
  onComplete,          // (slides) => void
  onCancel,            // () => void
  existingSlides = [], // Slides from previous iterations (for parent dropdown)
}) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [slidesMetadata, setSlidesMetadata] = useState(
    Array.from({ length: slideCount }, (_, i) => ({
      index: i,
      slideId: `slide-${i + 1}`,
      name: `Slide ${i + 1}`,
      type: 'content',
      parentSlideId: null,
      customMetadata: {},
    }))
  )

  const currentSlide = slidesMetadata[currentSlideIndex]

  const handleFieldChange = useCallback((field, value) => {
    setSlidesMetadata((prev) => {
      const updated = [...prev]
      updated[currentSlideIndex] = {
        ...updated[currentSlideIndex],
        [field]: value,
      }
      return updated
    })
  }, [currentSlideIndex])

  const handleCustomMetadataChange = useCallback((key, value) => {
    setSlidesMetadata((prev) => {
      const updated = [...prev]
      updated[currentSlideIndex] = {
        ...updated[currentSlideIndex],
        customMetadata: {
          ...updated[currentSlideIndex].customMetadata,
          [key]: value,
        },
      }
      return updated
    })
  }, [currentSlideIndex])

  const handleAddCustomField = useCallback(() => {
    setSlidesMetadata((prev) => {
      const updated = [...prev]
      updated[currentSlideIndex] = {
        ...updated[currentSlideIndex],
        customMetadata: {
          ...updated[currentSlideIndex].customMetadata,
          ['new_field']: '',
        },
      }
      return updated
    })
  }, [currentSlideIndex])

  const handleNavigate = useCallback((direction) => {
    const newIndex = currentSlideIndex + direction
    if (newIndex >= 0 && newIndex < slideCount) {
      setCurrentSlideIndex(newIndex)
    }
  }, [currentSlideIndex, slideCount])

  const handleComplete = useCallback(() => {
    // Validate metadata
    const errors = []
    const slideIds = new Set()
    
    slidesMetadata.forEach((slide, idx) => {
      if (!slide.slideId || slide.slideId.trim() === '') {
        errors.push(`Slide ${idx + 1}: Slide ID is required`)
      }
      if (slideIds.has(slide.slideId)) {
        errors.push(`Slide ${idx + 1}: Slide ID must be unique`)
      }
      slideIds.add(slide.slideId)
      
      if (!slide.name || slide.name.trim() === '') {
        errors.push(`Slide ${idx + 1}: Name is required`)
      }
      
      if (slide.parentSlideId && !existingSlides.find(s => s.slideId === slide.parentSlideId)) {
        errors.push(`Slide ${idx + 1}: Parent slide not found`)
      }
    })
    
    if (errors.length > 0) {
      alert('Validation errors:\n' + errors.join('\n'))
      return
    }
    
    onComplete(slidesMetadata)
  }, [slidesMetadata, existingSlides, onComplete])

  return (
    <div className="metadata-modal-overlay">
      <div className="metadata-modal">
        <div className="metadata-modal-header">
          <h2>Assign Metadata</h2>
          <p>Slide {currentSlideIndex + 1} of {slideCount}</p>
        </div>

        <div className="metadata-modal-body">
          <div className="metadata-form">
            {/* Slide ID */}
            <div className="form-group">
              <label htmlFor="slideId">Slide ID *</label>
              <input
                id="slideId"
                type="text"
                value={currentSlide.slideId}
                onChange={(e) => handleFieldChange('slideId', e.target.value)}
                placeholder="e.g., audi, bmw-3-series"
              />
              <small>Unique identifier for this slide (no spaces)</small>
            </div>

            {/* Name */}
            <div className="form-group">
              <label htmlFor="name">Name *</label>
              <input
                id="name"
                type="text"
                value={currentSlide.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="e.g., Audi, BMW 3 Series"
              />
            </div>

            {/* Type */}
            <div className="form-group">
              <label htmlFor="type">Type *</label>
              <select
                id="type"
                value={currentSlide.type}
                onChange={(e) => handleFieldChange('type', e.target.value)}
              >
                <option value="content">Content</option>
                <option value="manufacturer">Manufacturer</option>
                <option value="model">Model</option>
                <option value="product">Product</option>
                <option value="feature">Feature</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Parent Slide (only if existingSlides available) */}
            {existingSlides.length > 0 && (
              <div className="form-group">
                <label htmlFor="parentSlideId">Parent Slide</label>
                <select
                  id="parentSlideId"
                  value={currentSlide.parentSlideId || ''}
                  onChange={(e) => handleFieldChange('parentSlideId', e.target.value || null)}
                >
                  <option value="">None</option>
                  {existingSlides.map((slide) => (
                    <option key={slide.slideId} value={slide.slideId}>
                      {slide.name} ({slide.type})
                    </option>
                  ))}
                </select>
                <small>Link this slide to a parent from previous iterations</small>
              </div>
            )}

            {/* Custom Metadata */}
            <div className="form-group">
              <label>Custom Metadata</label>
              <div className="custom-metadata">
                {Object.entries(currentSlide.customMetadata).map(([key, value]) => (
                  <div key={key} className="metadata-field">
                    <input
                      type="text"
                      value={key}
                      readOnly
                      className="metadata-key"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleCustomMetadataChange(key, e.target.value)}
                      className="metadata-value"
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-small btn-secondary"
                onClick={handleAddCustomField}
              >
                + Add field
              </button>
            </div>
          </div>
        </div>

        <div className="metadata-modal-footer">
          <div className="nav-buttons">
            <button
              className="btn btn-link"
              onClick={() => handleNavigate(-1)}
              disabled={currentSlideIndex === 0}
            >
              ← Previous
            </button>
            <span className="slide-counter">
              {currentSlideIndex + 1} / {slideCount}
            </span>
            <button
              className="btn btn-link"
              onClick={() => handleNavigate(1)}
              disabled={currentSlideIndex === slideCount - 1}
            >
              Next →
            </button>
          </div>
          <div className="action-buttons">
            <button
              className="btn btn-secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleComplete}
            >
              Save & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Styling for MetadataModal

Add to `client/src/index.css`:

```css
.metadata-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.metadata-modal {
  background: var(--bg-secondary);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.metadata-modal-header {
  padding: 24px;
  border-bottom: 1px solid var(--border-color);
}

.metadata-modal-header h2 {
  margin: 0 0 8px 0;
  font-size: 18px;
}

.metadata-modal-header p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.metadata-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.metadata-form .form-group {
  margin-bottom: 20px;
}

.metadata-form label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 14px;
}

.metadata-form input,
.metadata-form select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: inherit;
  font-size: 14px;
}

.metadata-form small {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.custom-metadata {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.metadata-field {
  display: flex;
  gap: 8px;
}

.metadata-key {
  flex: 0 0 150px;
  background: var(--bg-tertiary);
}

.metadata-value {
  flex: 1;
}

.metadata-modal-footer {
  padding: 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.nav-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slide-counter {
  font-size: 14px;
  color: var(--text-secondary);
  min-width: 60px;
  text-align: center;
}

.action-buttons {
  display: flex;
  gap: 12px;
}
```

---

## Step 3: Update FlowSelectStep to Show Project Continuation

In `client/src/steps/FlowSelectStep.jsx`, add a prompt if project exists in session:

```javascript
import { useEffect, useState } from 'react'

export default function FlowSelectStep({ /* existing props */ }) {
  const [projectInSession, setProjectInSession] = useState(null)
  const [showContinuePrompt, setShowContinuePrompt] = useState(false)

  useEffect(() => {
    const projectId = sessionStorage.getItem('projectId')
    if (projectId) {
      // Fetch project details
      fetch(`/api/html-flow/project/${projectId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) {
            setProjectInSession(data)
            setShowContinuePrompt(true)
          }
        })
        .catch((err) => console.error('Failed to load project:', err))
    }
  }, [])

  const handleContinueProject = useCallback(() => {
    // Keep projectId in session, proceed to next step
    setShowContinuePrompt(false)
    navigateTo('html-upload')
  }, [navigateTo])

  const handleStartNew = useCallback(() => {
    // Clear session, proceed fresh
    sessionStorage.removeItem('projectId')
    setProjectInSession(null)
    setShowContinuePrompt(false)
    navigateTo('flow-select')
  }, [navigateTo])

  return (
    <>
      {/* Existing flow selector UI */}
      
      {showContinuePrompt && projectInSession && (
        <div className="continue-project-modal-overlay">
          <div className="continue-project-modal">
            <h2>Continue with existing project?</h2>
            <div className="project-info">
              <p><strong>Project:</strong> {projectInSession.projectName}</p>
              <p><strong>Iterations:</strong> {projectInSession.iterationCount}</p>
              <p><strong>Slides:</strong> {projectInSession.slideCount}</p>
              <p><strong>Last updated:</strong> {new Date(projectInSession.lastUpdated).toLocaleDateString()}</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleContinueProject}>
                Yes, continue
              </button>
              <button className="btn btn-secondary" onClick={handleStartNew}>
                No, start new project
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

---

## Step 4: Create save-iteration Endpoint

In `server/routes/html-flow.js`, add:

```javascript
// ── POST /api/html-flow/save-iteration ────────────────────────────────────

router.post('/html-flow/save-iteration', (req, res) => {
  try {
    const { chainId, projectName, projectId, action, slides } = req.body

    if (!chainId || !projectName || !action) {
      return res.status(400).json({ ok: false, error: 'Missing required fields.' })
    }

    if (!['save-and-continue', 'save-and-publish'].includes(action)) {
      return res.status(400).json({ ok: false, error: 'Invalid action.' })
    }

    // Validate slides
    if (!Array.isArray(slides) || slides.length === 0) {
      return res.status(400).json({ ok: false, error: 'No slides provided.' })
    }

    const slideIds = new Set()
    for (const slide of slides) {
      if (!slide.slideId || !slide.name || !slide.type) {
        return res.status(400).json({ ok: false, error: 'Invalid slide metadata.' })
      }
      if (slideIds.has(slide.slideId)) {
        return res.status(400).json({ ok: false, error: `Duplicate slideId: ${slide.slideId}` })
      }
      slideIds.add(slide.slideId)
    }

    const chainDir = resolveChainDir(chainId)
    if (!chainDir) return res.status(400).json({ ok: false, error: 'Invalid chainId.' })

    const chainPath = path.join(chainDir, 'chain.json')
    if (!fs.existsSync(chainPath)) {
      return res.status(404).json({ ok: false, error: 'Project not found.' })
    }

    const chain = JSON.parse(fs.readFileSync(chainPath, 'utf8'))
    const outputFile = chain.rounds[chain.rounds.length - 1]?.outputFile
    if (!outputFile) {
      return res.status(400).json({ ok: false, error: 'No output found.' })
    }

    const outputPath = path.join(chainDir, outputFile)
    const patchedHtml = fs.readFileSync(outputPath, 'utf8')

    // Determine project folder
    let projectFolder
    let projectIdToUse = projectId

    if (!projectId) {
      // First iteration - create new project folder
      projectIdToUse = projectName.toLowerCase().replace(/\s+/g, '-')
      projectFolder = path.join(CHAINS_DIR, projectIdToUse)
      fs.mkdirSync(projectFolder, { recursive: true })
    } else {
      // Subsequent iteration - use existing project folder
      projectFolder = path.join(CHAINS_DIR, projectId)
      if (!fs.existsSync(projectFolder)) {
        return res.status(404).json({ ok: false, error: 'Project folder not found.' })
      }
    }

    // Create slides folder
    const slidesFolder = path.join(projectFolder, 'slides')
    fs.mkdirSync(slidesFolder, { recursive: true })

    // Split patched HTML into individual slides
    const sections = patchedHtml.match(/<section[^>]*>[\s\S]*?<\/section>/g) || []
    
    if (sections.length !== slides.length) {
      return res.status(400).json({ 
        ok: false, 
        error: `Slide count mismatch: ${sections.length} sections but ${slides.length} metadata entries.` 
      })
    }

    // Write individual slide files with metadata
    const slideFiles = []
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      const slideMetadata = slides[i]
      const fileName = `${slideMetadata.slideId}.html`

      // Inject metadata into slide
      const slideHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
</head>
<body>
${section}
<script type="application/json" id="solon-metadata">
${JSON.stringify({
  version: '1.0',
  slideId: slideMetadata.slideId,
  name: slideMetadata.name,
  type: slideMetadata.type,
  hierarchyLevel: slideMetadata.hierarchyLevel || 0,
  projectId: projectIdToUse,
  iterationId: chain.id,
  sequenceNumber: i + 1,
  sequenceTotal: sections.length,
  parentSlideId: slideMetadata.parentSlideId || null,
  customMetadata: slideMetadata.customMetadata || {},
  generatedAt: new Date().toISOString(),
}, null, 2)}
</script>
</body>
</html>`

      const slidePath = path.join(slidesFolder, fileName)
      fs.writeFileSync(slidePath, slideHtml, 'utf8')
      slideFiles.push({
        slideId: slideMetadata.slideId,
        fileName,
        ...slideMetadata,
      })
    }

    // Create or update manifest
    const manifestPath = path.join(projectFolder, 'manifest.json')
    let manifest = fs.existsSync(manifestPath)
      ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      : {
          version: '1.0',
          projectId: projectIdToUse,
          projectName,
          projectMetadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          iterations: [],
          slideIndex: {},
        }

    // Add iteration
    const iterationId = `iteration-${manifest.iterations.length + 1}`
    manifest.iterations.push({
      iterationId,
      iterationName: `Iteration ${manifest.iterations.length + 1}`,
      type: slides[0]?.type || 'content',
      slideCount: slideFiles.length,
      createdAt: new Date().toISOString(),
      slides: slideFiles,
    })

    // Update slide index
    for (const slide of slideFiles) {
      manifest.slideIndex[slide.slideId] = {
        iterationId,
        fileName: slide.fileName,
        type: slide.type,
      }
    }

    manifest.projectMetadata.updatedAt = new Date().toISOString()
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')

    // Generate web app if action is publish
    let appPath = null
    if (action === 'save-and-publish') {
      appPath = generateWebApp(projectFolder, manifest)
    }

    // Create README
    const readmePath = path.join(projectFolder, 'README.md')
    const readme = `# ${projectName}

Generated by SOLON — Hierarchical Presentation Generator

## Project Structure

- \`slides/\` — Individual HTML slides
- \`app/\` — Interactive web application (open \`index.html\` in browser)
- \`manifest.json\` — Project metadata and slide index

## How to Use

1. Open \`app/index.html\` in your web browser
2. Browse the slides using the navigation menu
3. Click on slides to view them in detail
4. Use search and filters to find content

## Metadata

Each slide contains metadata describing:
- Slide ID and name
- Type and hierarchy level
- Parent-child relationships
- Custom metadata fields

See \`manifest.json\` for complete project structure.
`
    fs.writeFileSync(readmePath, readme, 'utf8')

    const response = {
      ok: true,
      projectId: projectIdToUse,
      projectPath: projectFolder,
      projectName,
      iterationCount: manifest.iterations.length,
      slideCount: slideFiles.length,
      action,
      downloadUrl: action === 'save-and-publish' 
        ? `/api/html-flow/download-project/${projectIdToUse}` 
        : null,
      appPath,
    }

    return res.json(response)
  } catch (err) {
    console.error('[html-flow] save-iteration error:', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})
```

---

## Step 5: Add Download-Project Endpoint

```javascript
// ── GET /api/html-flow/download-project/:projectId ────────────────────────

router.get('/download-project/:projectId', (req, res) => {
  try {
    const { projectId } = req.params

    if (!/^[\w\-]+$/.test(projectId)) {
      return res.status(400).json({ ok: false, error: 'Invalid projectId.' })
    }

    const projectPath = path.join(CHAINS_DIR, projectId)
    if (!isInsideDir(projectPath, RESOLVED_CHAINS_DIR)) {
      return res.status(400).json({ ok: false, error: 'Invalid path.' })
    }
    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ ok: false, error: 'Project not found.' })
    }

    // Create ZIP file
    const archiver = require('archiver')
    const zipPath = path.join(os.tmpdir(), `${projectId}-${Date.now()}.zip`)
    const output = fs.createWriteStream(zipPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    archive.on('error', (err) => {
      throw err
    })

    output.on('close', () => {
      res.download(zipPath, `${projectId}.zip`, (err) => {
        if (err) console.error('Download error:', err)
        fs.unlink(zipPath, (unlinkErr) => {
          if (unlinkErr) console.error('Cleanup error:', unlinkErr)
        })
      })
    })

    archive.pipe(output)
    archive.directory(projectPath, projectId)
    archive.finalize()
  } catch (err) {
    console.error('[html-flow] download-project error:', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})
```

---

## Step 6: Add Project Endpoint

```javascript
// ── GET /api/html-flow/project/:projectId ────────────────────────────────

router.get('/project/:projectId', (req, res) => {
  try {
    const { projectId } = req.params

    if (!/^[\w\-]+$/.test(projectId)) {
      return res.status(400).json({ ok: false, error: 'Invalid projectId.' })
    }

    const projectPath = path.join(CHAINS_DIR, projectId)
    if (!isInsideDir(projectPath, RESOLVED_CHAINS_DIR)) {
      return res.status(400).json({ ok: false, error: 'Invalid path.' })
    }

    const manifestPath = path.join(projectPath, 'manifest.json')
    if (!fs.existsSync(manifestPath)) {
      return res.status(404).json({ ok: false, error: 'Project not found.' })
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    const allSlides = manifest.iterations.flatMap((iter) => iter.slides)
    const slideCount = allSlides.length

    return res.json({
      ok: true,
      projectId,
      projectName: manifest.projectName,
      iterationCount: manifest.iterations.length,
      slideCount,
      lastUpdated: manifest.projectMetadata.updatedAt,
      slides: allSlides.map((s) => ({
        slideId: s.slideId,
        name: s.name,
        type: s.type,
        hierarchyLevel: s.hierarchyLevel,
      })),
    })
  } catch (err) {
    console.error('[html-flow] project error:', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})
```

---

## Testing Checklist

### Unit Tests
- [ ] MetadataModal handles slide navigation
- [ ] MetadataModal validates slideId uniqueness
- [ ] MetadataModal validates parent slide references
- [ ] save-iteration endpoint creates project folder
- [ ] save-iteration endpoint creates slides with metadata
- [ ] save-iteration endpoint creates manifest.json
- [ ] download-project endpoint generates ZIP

### E2E Tests
- [ ] User can complete flow and click "Package & Publish"
- [ ] Metadata modal appears with all fields
- [ ] User can edit metadata and navigate between slides
- [ ] Clicking "Save & Continue" saves iteration and returns to flow selector
- [ ] Clicking "Package & Publish" saves iteration and shows download dialog
- [ ] Downloaded ZIP contains all expected files
- [ ] Subsequent iteration shows "Continue with project?" prompt
- [ ] Subsequent iteration can link slides via parent dropdown
- [ ] Web app is generated and opens correctly

---

## Summary

This implementation provides:
1. **Cleaner preview step** with two focused buttons
2. **Metadata modal** for rich slide annotation
3. **Project persistence** with manifest.json
4. **Multi-iteration support** with parent-child linking
5. **Automatic web app generation** on publish
6. **ZIP download** for easy distribution

All changes are backward-compatible and non-breaking to existing workflows.
