# Implementation Guide: Hierarchy Definition Step

This document provides detailed implementation guidance for the new Hierarchy Definition Step component and its integration into the SOLON flow.

---

## Overview

The Hierarchy Definition Step is a **dedicated, isolated step** that appears after the preview step and before the action buttons. Its purpose is to:

1. Allow users to assign metadata to each slide
2. Define parent-child relationships (hierarchy)
3. Visualize the resulting hierarchy in real-time
4. Validate all metadata before saving

---

## Component Architecture

```
HtmlPreviewStep (existing)
├── Preview iframe
├── Slide navigation
└── Actions
    ├── "← Back to recipe"
    └── [NEW] "Next" or "Continue to Hierarchy"

HierarchyDefinitionStep (NEW)
├── Header (title + slide counter)
├── Main Layout (two panels)
│   ├── Left Panel: MetadataForm
│   │   ├── slideId input
│   │   ├── name input
│   │   ├── type dropdown
│   │   ├── parentSlideId dropdown (conditional)
│   │   └── customMetadata (key-value pairs)
│   └── Right Panel: HierarchyPreview
│       ├── Tree visualization
│       ├── Status indicators (◐, ✓, ○)
│       └── Color coding (optional)
├── Navigation (Previous/Next)
└── Actions
    ├── "← Back to preview"
    ├── "Generate more content"
    └── "Package & Publish"
```

---

## Step 1: Modify HtmlPreviewStep

Add a "Next" button to navigate to Hierarchy Definition Step.

### Current Code
```javascript
export default function HtmlPreviewStep({
  project,
  applied,
  step,
  canNavigateTo,
  navigateTo,
  onBack,
  onStartNew,
  setToast,
  debugContext,
}) {
  // ... existing code
  
  return (
    <div className="html-preview-step-layout">
      {/* Preview iframe */}
      {/* Slide navigation */}
      
      <div className="html-preview-step-actions">
        <button className="btn btn-link" onClick={onBack}>
          ← Back to recipe
        </button>
        <div className="html-preview-step-right-actions">
          <button className="btn btn-secondary" onClick={handleDownload}>
            Download HTML
          </button>
          <button className="btn btn-primary" onClick={handleStartNew}>
            Start new project
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Changes Required

```javascript
const handleContinueToHierarchy = useCallback(() => {
  // Navigate to hierarchy definition step with current data
  navigateTo('html-hierarchy', {
    chainId,
    projectName,
    projectId: project.projectId,
    slideCount,
    roundId: applied.roundId,
    outputFile: applied.outputFile,
  })
}, [chainId, projectName, project.projectId, slideCount, applied.roundId, applied.outputFile, navigateTo])

return (
  <div className="html-preview-step-layout">
    {/* Preview iframe */}
    {/* Slide navigation */}
    
    <div className="html-preview-step-actions">
      <button className="btn btn-link" onClick={onBack}>
        ← Back to recipe
      </button>
      <button 
        className="btn btn-primary" 
        onClick={handleContinueToHierarchy}
      >
        Next: Define Hierarchy
      </button>
    </div>
  </div>
)
```

---

## Step 2: Create HierarchyDefinitionStep Component

Create `client/src/steps/HierarchyDefinitionStep.jsx`:

```javascript
import { useState, useCallback, useMemo, useEffect } from 'react'
import AppHeader from '../components/AppHeader.jsx'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import HierarchyPreview from '../components/HierarchyPreview.jsx'

export default function HierarchyDefinitionStep({
  project,           // { chainId, projectName, projectId }
  applied,           // { roundId, outputFile }
  slideCount,        // Total number of slides
  existingSlides,    // Slides from previous iterations (for parent dropdown)
  step,
  canNavigateTo,
  navigateTo,
  onBack,            // Back to preview
  onContinue,        // Generate more content
  onPublish,         // Package & publish
  setToast,
  debugContext,
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

  // Build hierarchy tree for preview
  const hierarchyTree = useMemo(() => {
    const tree = []
    const parentMap = new Map()

    // Add existing slides (from previous iterations)
    if (existingSlides) {
      for (const slide of existingSlides) {
        if (!slide.parentSlideId) {
          tree.push({
            ...slide,
            status: 'confirmed',
            children: [],
          })
          parentMap.set(slide.slideId, tree[tree.length - 1])
        }
      }
      for (const slide of existingSlides) {
        if (slide.parentSlideId && parentMap.has(slide.parentSlideId)) {
          parentMap.get(slide.parentSlideId).children.push({
            ...slide,
            status: 'confirmed',
            children: [],
          })
        }
      }
    }

    // Add current slides (being edited)
    for (const slide of slidesMetadata) {
      if (!slide.parentSlideId) {
        const status = slide.index === currentSlideIndex ? 'editing' : 'pending'
        tree.push({
          ...slide,
          status,
          children: [],
        })
        parentMap.set(slide.slideId, tree[tree.length - 1])
      }
    }

    // Attach children to parents
    for (const slide of slidesMetadata) {
      if (slide.parentSlideId && parentMap.has(slide.parentSlideId)) {
        const status = slide.index === currentSlideIndex ? 'editing' : 'pending'
        parentMap.get(slide.parentSlideId).children.push({
          ...slide,
          status,
          children: [],
        })
      }
    }

    return tree
  }, [slidesMetadata, existingSlides, currentSlideIndex])

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

  const handleRemoveCustomField = useCallback((key) => {
    setSlidesMetadata((prev) => {
      const updated = [...prev]
      const metadata = { ...updated[currentSlideIndex].customMetadata }
      delete metadata[key]
      updated[currentSlideIndex] = {
        ...updated[currentSlideIndex],
        customMetadata: metadata,
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

  const validateMetadata = useCallback(() => {
    const errors = []
    const slideIds = new Set()

    slidesMetadata.forEach((slide, idx) => {
      if (!slide.slideId || slide.slideId.trim() === '') {
        errors.push(`Slide ${idx + 1}: Slide ID is required`)
      } else if (!/^[a-z0-9\-_]+$/.test(slide.slideId)) {
        errors.push(`Slide ${idx + 1}: Slide ID must contain only lowercase letters, numbers, hyphens, and underscores`)
      }

      if (slideIds.has(slide.slideId)) {
        errors.push(`Slide ${idx + 1}: Slide ID must be unique`)
      }
      slideIds.add(slide.slideId)

      if (!slide.name || slide.name.trim() === '') {
        errors.push(`Slide ${idx + 1}: Name is required`)
      }

      if (slide.parentSlideId) {
        const parentExists = existingSlides?.some(s => s.slideId === slide.parentSlideId) ||
                            slidesMetadata.some(s => s.slideId === slide.parentSlideId && s.index !== slide.index)
        if (!parentExists) {
          errors.push(`Slide ${idx + 1}: Parent slide not found`)
        }

        // Check for circular references
        const checkCircular = (slideId, visited = new Set()) => {
          if (visited.has(slideId)) return true
          visited.add(slideId)
          const parent = slidesMetadata.find(s => s.slideId === slideId)?.parentSlideId
          if (!parent) return false
          return checkCircular(parent, visited)
        }
        if (checkCircular(slide.slideId)) {
          errors.push(`Slide ${idx + 1}: Circular parent reference detected`)
        }
      }
    })

    return errors
  }, [slidesMetadata, existingSlides])

  const handleContinue = useCallback(async () => {
    const errors = validateMetadata()
    if (errors.length > 0) {
      setToast({
        type: 'error',
        message: `Validation errors:\n${errors.join('\n')}`,
      })
      return
    }

    try {
      const response = await fetch('/api/html-flow/save-iteration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId: project.chainId,
          projectName: project.projectName,
          projectId: project.projectId || null,
          action: 'save-and-continue',
          slides: slidesMetadata,
        }),
      })

      const result = await response.json()

      if (!result.ok) {
        setToast({ type: 'error', message: result.error })
        return
      }

      // Store projectId in session for next iteration
      sessionStorage.setItem('projectId', result.projectId)
      sessionStorage.setItem('projectName', result.projectName)

      setToast({
        type: 'success',
        message: `Iteration saved! You can now generate more content.`,
      })

      // Navigate back to flow selector
      setTimeout(() => onContinue(), 1000)
    } catch (err) {
      setToast({ type: 'error', message: err.message })
    }
  }, [validateMetadata, project, slidesMetadata, setToast, onContinue])

  const handlePublish = useCallback(async () => {
    const errors = validateMetadata()
    if (errors.length > 0) {
      setToast({
        type: 'error',
        message: `Validation errors:\n${errors.join('\n')}`,
      })
      return
    }

    try {
      const response = await fetch('/api/html-flow/save-iteration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId: project.chainId,
          projectName: project.projectName,
          projectId: project.projectId || null,
          action: 'save-and-publish',
          slides: slidesMetadata,
        }),
      })

      const result = await response.json()

      if (!result.ok) {
        setToast({ type: 'error', message: result.error })
        return
      }

      setToast({
        type: 'success',
        message: 'Project packaged! Preparing download...',
      })

      // Show download dialog or trigger download
      if (result.downloadUrl) {
        setTimeout(() => {
          window.location.href = result.downloadUrl
        }, 500)
      }

      // Clear session and navigate back to flow selector
      sessionStorage.removeItem('projectId')
      sessionStorage.removeItem('projectName')
      setTimeout(() => onPublish(), 2000)
    } catch (err) {
      setToast({ type: 'error', message: err.message })
    }
  }, [validateMetadata, project, slidesMetadata, setToast, onPublish])

  return (
    <div className="app">
      <AppHeader
        title={project.projectName}
        subtitle="Define hierarchy and metadata for your slides"
        debugContext={debugContext}
      />
      <Breadcrumbs step={step} canNavigateTo={canNavigateTo} navigateTo={navigateTo} flow="html" />

      <div className="hierarchy-definition-step-layout">
        <div className="hierarchy-definition-container">
          {/* Left Panel: Metadata Form */}
          <div className="hierarchy-definition-form-panel">
            <div className="form-header">
              <h3>Slide {currentSlideIndex + 1} of {slideCount}</h3>
            </div>

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
                <small>Unique identifier (lowercase, hyphens/underscores only)</small>
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
                  <option value="specification">Specification</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* Parent Slide (only if existingSlides available) */}
              {existingSlides && existingSlides.length > 0 && (
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
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => handleRemoveCustomField(key)}
                        aria-label="Remove field"
                      >
                        ×
                      </button>
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

          {/* Right Panel: Hierarchy Preview */}
          <div className="hierarchy-definition-preview-panel">
            <HierarchyPreview
              tree={hierarchyTree}
              currentSlideId={currentSlide.slideId}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="hierarchy-definition-nav">
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

        {/* Actions */}
        <div className="hierarchy-definition-actions">
          <button className="btn btn-link" onClick={onBack}>
            ← Back to preview
          </button>
          <div className="hierarchy-definition-right-actions">
            <button
              className="btn btn-secondary"
              onClick={handleContinue}
            >
              Generate more content
            </button>
            <button
              className="btn btn-primary"
              onClick={handlePublish}
            >
              Package & Publish
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## Step 3: Create HierarchyPreview Component

Create `client/src/components/HierarchyPreview.jsx`:

```javascript
import { useMemo } from 'react'

export default function HierarchyPreview({ tree, currentSlideId }) {
  const renderNode = (node, depth = 0) => {
    const statusIcon = {
      confirmed: '✓',
      editing: '◐',
      pending: '○',
    }[node.status] || '○'

    const statusClass = `status-${node.status}`

    return (
      <div key={node.slideId} className={`hierarchy-node ${statusClass}`}>
        <div className="node-content">
          <span className="status-icon">{statusIcon}</span>
          <span className="node-name">{node.name}</span>
          <span className="node-type">({node.type})</span>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="node-children" style={{ paddingLeft: `${depth * 20}px` }}>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="hierarchy-preview">
      <div className="hierarchy-preview-header">
        <h3>Current Hierarchy</h3>
      </div>
      <div className="hierarchy-preview-content">
        <div className="hierarchy-tree">
          <div className="hierarchy-root">
            <span className="root-label">Root</span>
          </div>
          {tree.map((node) => renderNode(node))}
        </div>
      </div>
      <div className="hierarchy-preview-legend">
        <div className="legend-item">
          <span className="legend-icon">✓</span> Confirmed
        </div>
        <div className="legend-item">
          <span className="legend-icon">◐</span> Editing
        </div>
        <div className="legend-item">
          <span className="legend-icon">○</span> Pending
        </div>
      </div>
    </div>
  )
}
```

---

## Step 4: Add Styling

Add to `client/src/index.css`:

```css
/* Hierarchy Definition Step */

.hierarchy-definition-step-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 16px;
  padding: 24px;
}

.hierarchy-definition-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  flex: 1;
  min-height: 0;
}

.hierarchy-definition-form-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.form-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}

.form-header h3 {
  margin: 0;
  font-size: 16px;
}

.metadata-form {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
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
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: center;
}

.metadata-key {
  background: var(--bg-tertiary);
}

.metadata-value {
  flex: 1;
}

/* Hierarchy Preview */

.hierarchy-definition-preview-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-secondary);
}

.hierarchy-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.hierarchy-preview-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}

.hierarchy-preview-header h3 {
  margin: 0;
  font-size: 16px;
}

.hierarchy-preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.hierarchy-tree {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.hierarchy-root {
  margin-bottom: 8px;
  padding: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
}

.root-label {
  font-weight: 600;
  color: var(--text-primary);
}

.hierarchy-node {
  margin-left: 16px;
  padding: 4px 0;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
}

.status-icon {
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.status-confirmed .node-content {
  color: var(--accent-success, #4CAF80);
}

.status-editing .node-content {
  background: rgba(76, 175, 128, 0.1);
  color: var(--accent-primary);
  font-weight: 600;
}

.status-pending .node-content {
  color: var(--text-secondary);
}

.node-name {
  font-weight: 500;
}

.node-type {
  font-size: 12px;
  color: var(--text-secondary);
}

.node-children {
  margin-top: 4px;
}

.hierarchy-preview-legend {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  display: flex;
  gap: 16px;
  font-size: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-icon {
  font-weight: 600;
  min-width: 16px;
  text-align: center;
}

/* Navigation */

.hierarchy-definition-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.slide-counter {
  font-size: 14px;
  color: var(--text-secondary);
  min-width: 60px;
  text-align: center;
}

/* Actions */

.hierarchy-definition-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.hierarchy-definition-right-actions {
  display: flex;
  gap: 12px;
}

/* Responsive */

@media (max-width: 1200px) {
  .hierarchy-definition-container {
    grid-template-columns: 1fr;
  }
}
```

---

## Step 5: Integrate into App.jsx

Update the main App component to include the new step:

```javascript
import HierarchyDefinitionStep from './steps/HierarchyDefinitionStep.jsx'

export default function App() {
  // ... existing code
  
  const handleHierarchyDefinition = useCallback((data) => {
    // data includes chainId, projectName, projectId, slideCount, etc.
    setCurrentStep('html-hierarchy')
    setStepData(data)
  }, [])

  return (
    <>
      {currentStep === 'html-preview' && (
        <HtmlPreviewStep
          // ... existing props
          onNavigateToHierarchy={handleHierarchyDefinition}
        />
      )}
      
      {currentStep === 'html-hierarchy' && (
        <HierarchyDefinitionStep
          project={{
            chainId: stepData.chainId,
            projectName: stepData.projectName,
            projectId: stepData.projectId,
          }}
          applied={{
            roundId: stepData.roundId,
            outputFile: stepData.outputFile,
          }}
          slideCount={stepData.slideCount}
          existingSlides={stepData.existingSlides || []}
          step={currentStep}
          canNavigateTo={canNavigateTo}
          navigateTo={navigateTo}
          onBack={() => setCurrentStep('html-preview')}
          onContinue={() => setCurrentStep('flow-select')}
          onPublish={() => setCurrentStep('flow-select')}
          setToast={setToast}
          debugContext={debugContext}
        />
      )}
    </>
  )
}
```

---

## Step 6: Update FlowSelectStep for Project Continuation

Add project continuation prompt to `client/src/steps/FlowSelectStep.jsx`:

```javascript
import { useEffect, useState } from 'react'

export default function FlowSelectStep({ /* ... */ }) {
  const [projectInSession, setProjectInSession] = useState(null)
  const [showContinuePrompt, setShowContinuePrompt] = useState(false)

  useEffect(() => {
    const projectId = sessionStorage.getItem('projectId')
    const projectName = sessionStorage.getItem('projectName')
    
    if (projectId && projectName) {
      fetch(`/api/html-flow/project/${projectId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) {
            setProjectInSession({
              projectId,
              projectName,
              ...data,
            })
            setShowContinuePrompt(true)
          }
        })
        .catch((err) => console.error('Failed to load project:', err))
    }
  }, [])

  const handleContinueProject = useCallback(() => {
    // Project ID already in session, proceed to upload
    setShowContinuePrompt(false)
    navigateTo('html-upload')
  }, [navigateTo])

  const handleStartNew = useCallback(() => {
    sessionStorage.removeItem('projectId')
    sessionStorage.removeItem('projectName')
    setProjectInSession(null)
    setShowContinuePrompt(false)
  }, [])

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
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleContinueProject}>
                Yes, continue
              </button>
              <button className="btn btn-secondary" onClick={handleStartNew}>
                No, start new
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

## Testing Checklist

### Unit Tests
- [ ] HierarchyDefinitionStep renders correctly
- [ ] Metadata form updates state correctly
- [ ] Navigation between slides works
- [ ] Custom metadata can be added/removed
- [ ] Validation detects missing fields
- [ ] Validation detects duplicate slideIds
- [ ] Validation detects circular parent references
- [ ] HierarchyPreview renders tree correctly
- [ ] Status icons update correctly (◐, ✓, ○)

### E2E Tests
- [ ] User can navigate from preview to hierarchy step
- [ ] User can edit metadata for each slide
- [ ] Hierarchy preview updates in real-time
- [ ] User can set parent slides
- [ ] Clicking "Generate More Content" saves iteration
- [ ] Clicking "Package & Publish" saves and generates web app
- [ ] Project continuation prompt appears on next flow
- [ ] Parent dropdown populated with existing slides
- [ ] Circular reference validation works
- [ ] Downloaded ZIP contains all files

---

## Summary

This implementation provides:
1. **Dedicated hierarchy definition step** isolated from preview
2. **Split-panel UI** with metadata form and hierarchy preview
3. **Real-time hierarchy visualization** with status indicators
4. **Parent-child linking** for multi-iteration projects
5. **Comprehensive validation** before saving
6. **Project continuation** across iterations

The step is fully integrated into the SOLON flow and provides a clean, focused UX for defining metadata and hierarchy.
