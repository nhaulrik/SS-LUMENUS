# Hierarchical Projects — Phased Implementation Plan

## Overview

This document outlines a **phased, incremental approach** to building the hierarchical projects feature. Each phase is **self-contained**, **immediately valuable**, and **ready to ship**.

---

## Phase 1: Folder-Based Project Structure (IMMEDIATE - Weeks 1-2)

### Goal
Change the current "Download HTML" functionality to save all generated slides as individual HTML files in a dedicated project folder, instead of a single HTML file.

### What Changes
**Current behavior:**
```
User clicks "Download HTML" → Single output-uuid.html file downloaded
```

**New behavior:**
```
User clicks "Save Project" → Project folder created with individual slide files
Project structure:
  project-name/
  ├── slide-1.html
  ├── slide-2.html
  └── slide-3.html
```

### User Journey

1. User completes the flow (upload, zones, recipe, apply content)
2. In preview step, user reviews generated slides
3. User clicks "Save Project" (replaces "Download HTML")
4. User enters project name (or uses default from template)
5. Project folder is created on server with individual slide files
6. Download dialog appears: "Download project folder as ZIP"
7. User downloads ZIP file
8. User extracts ZIP and has a folder with all slides

### Implementation Details

#### 1.1 Modify HtmlPreviewStep.jsx

**Current code:**
```javascript
const handleDownload = useCallback(() => {
  const url = `/api/html-flow/download/${chainId}/${outputFile}`
  const a = document.createElement('a')
  a.href = url
  a.download = outputFile
  a.click()
}, [chainId, outputFile])

return (
  // ...
  <button className="btn btn-secondary" onClick={handleDownload}>
    Download HTML
  </button>
)
```

**New code:**
```javascript
const [projectName, setProjectName] = useState(project.projectName || 'presentation')
const [showSaveDialog, setShowSaveDialog] = useState(false)

const handleSaveProject = useCallback(() => {
  setShowSaveDialog(true)
}, [])

const handleConfirmSave = useCallback(async (name) => {
  try {
    const response = await fetch('/api/html-flow/save-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chainId,
        projectName: name,
        slideCount,
      }),
    })

    const result = await response.json()
    
    if (!result.ok) {
      setToast({ type: 'error', message: result.error })
      return
    }

    setToast({ type: 'success', message: 'Project saved! Download starting...' })
    
    // Trigger download
    window.location.href = result.downloadUrl
    
    setShowSaveDialog(false)
  } catch (err) {
    setToast({ type: 'error', message: err.message })
  }
}, [chainId, slideCount, setToast])

return (
  // ...
  <button className="btn btn-secondary" onClick={handleSaveProject}>
    Save Project
  </button>
  
  {showSaveDialog && (
    <SaveProjectDialog
      defaultName={projectName}
      onConfirm={handleConfirmSave}
      onCancel={() => setShowSaveDialog(false)}
    />
  )}
)
```

#### 1.2 Create SaveProjectDialog Component

Create `client/src/components/SaveProjectDialog.jsx`:

```javascript
import { useState, useCallback } from 'react'

export default function SaveProjectDialog({
  defaultName,
  onConfirm,
  onCancel,
}) {
  const [name, setName] = useState(defaultName)
  const [loading, setLoading] = useState(false)

  const handleConfirm = useCallback(async () => {
    if (!name.trim()) {
      alert('Please enter a project name')
      return
    }
    setLoading(true)
    await onConfirm(name.trim())
    setLoading(false)
  }, [name, onConfirm])

  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <h2>Save Project</h2>
        
        <div className="dialog-body">
          <label htmlFor="projectName">Project Name</label>
          <input
            id="projectName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Car Manufacturers"
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleConfirm()
            }}
            disabled={loading}
          />
          <small>This will be the folder name for your project</small>
        </div>

        <div className="dialog-actions">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Project'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

#### 1.3 Create save-project Endpoint

In `server/routes/html-flow.js`, add:

```javascript
// ── POST /api/html-flow/save-project ──────────────────────────────────

router.post('/html-flow/save-project', (req, res) => {
  try {
    const { chainId, projectName, slideCount } = req.body

    if (!chainId || !projectName) {
      return res.status(400).json({ ok: false, error: 'Missing required fields.' })
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
    if (!fs.existsSync(outputPath)) {
      return res.status(404).json({ ok: false, error: 'Output file not found.' })
    }

    // Read the patched HTML
    const patchedHtml = fs.readFileSync(outputPath, 'utf8')

    // Create project folder
    const projectFolder = path.join(chainDir, projectName)
    fs.mkdirSync(projectFolder, { recursive: true })

    // Split HTML into individual slides
    const sections = patchedHtml.match(/<section[^>]*>[\s\S]*?<\/section>/g) || []
    
    if (sections.length === 0) {
      return res.status(400).json({ ok: false, error: 'No slides found in output.' })
    }

    // Write individual slide files
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      const slideNumber = i + 1
      const fileName = `slide-${slideNumber}.html`
      
      // Create minimal HTML document for each slide
      const slideHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Slide ${slideNumber}</title>
</head>
<body>
${section}
</body>
</html>`

      const slidePath = path.join(projectFolder, fileName)
      fs.writeFileSync(slidePath, slideHtml, 'utf8')
    }

    // Create a ZIP file
    const archiver = require('archiver')
    const zipFileName = `${projectName}-${Date.now()}.zip`
    const zipPath = path.join(os.tmpdir(), zipFileName)
    const output = fs.createWriteStream(zipPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    archive.on('error', (err) => {
      throw err
    })

    output.on('close', () => {
      // Return download URL
      return res.json({
        ok: true,
        projectName,
        slideCount: sections.length,
        downloadUrl: `/api/html-flow/download-project/${chainId}/${projectName}/${zipFileName}`,
      })
    })

    archive.pipe(output)
    archive.directory(projectFolder, projectName)
    archive.finalize()
  } catch (err) {
    console.error('[html-flow] save-project error:', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})
```

#### 1.4 Create download-project Endpoint

In `server/routes/html-flow.js`, add:

```javascript
// ── GET /api/html-flow/download-project/:chainId/:projectName/:zipFile ──

router.get('/download-project/:chainId/:projectName/:zipFile', (req, res) => {
  try {
    const { chainId, projectName, zipFile } = req.params

    // Validate inputs
    if (!/^[\w\-]+$/.test(chainId) || !/^[\w\-. ]+$/.test(projectName)) {
      return res.status(400).json({ ok: false, error: 'Invalid parameters.' })
    }

    if (!/^[\w\-]+\.zip$/.test(zipFile)) {
      return res.status(400).json({ ok: false, error: 'Invalid zip file.' })
    }

    const zipPath = path.join(os.tmpdir(), zipFile)
    
    if (!fs.existsSync(zipPath)) {
      return res.status(404).json({ ok: false, error: 'File not found.' })
    }

    res.setHeader('Content-Disposition', `attachment; filename="${projectName}.zip"`)
    res.setHeader('Content-Type', 'application/zip')
    
    res.download(zipPath, `${projectName}.zip`, (err) => {
      if (err) console.error('Download error:', err)
      // Clean up temp file after download
      fs.unlink(zipPath, (unlinkErr) => {
        if (unlinkErr) console.error('Cleanup error:', unlinkErr)
      })
    })
  } catch (err) {
    console.error('[html-flow] download-project error:', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})
```

#### 1.5 Add Styling

Add to `client/src/index.css`:

```css
/* Save Project Dialog */

.dialog-overlay {
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

.dialog {
  background: var(--bg-secondary);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 400px;
  padding: 24px;
}

.dialog h2 {
  margin: 0 0 16px 0;
  font-size: 18px;
}

.dialog-body {
  margin-bottom: 24px;
}

.dialog-body label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 14px;
}

.dialog-body input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: inherit;
  font-size: 14px;
  margin-bottom: 8px;
}

.dialog-body small {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.dialog-actions button {
  min-width: 100px;
}
```

### Testing

#### Unit Tests
- [ ] SaveProjectDialog renders correctly
- [ ] Input value updates when user types
- [ ] Enter key triggers confirm
- [ ] Cancel button calls onCancel
- [ ] Confirm button calls onConfirm with name

#### E2E Tests
- [ ] User can complete flow and reach preview
- [ ] User clicks "Save Project"
- [ ] Dialog appears with default name
- [ ] User can edit project name
- [ ] User clicks "Save Project" in dialog
- [ ] Download starts automatically
- [ ] ZIP file contains project folder with individual slide files
- [ ] Each slide file is valid HTML with <section> content

### Deliverables

1. ✅ Modified HtmlPreviewStep with "Save Project" button
2. ✅ SaveProjectDialog component
3. ✅ save-project endpoint
4. ✅ download-project endpoint
5. ✅ CSS styling
6. ✅ E2E tests

### Value Provided

- **Immediate Value:** Users can save multiple slides as separate files in a folder
- **Foundation:** Sets up folder structure for future phases
- **Backward Compatible:** Old download endpoint still works
- **Ready to Ship:** Self-contained, fully testable

### Files Modified/Created

**New Files:**
- `client/src/components/SaveProjectDialog.jsx`

**Modified Files:**
- `client/src/steps/HtmlPreviewStep.jsx`
- `server/routes/html-flow.js`
- `client/src/index.css`

---

## Phase 2: Metadata Assignment UI (Weeks 3-4)

### Goal
Add metadata assignment to each slide before saving. Users can define slideId, name, and type for each slide.

### What Changes
- Before saving, show metadata form for each slide
- User can edit slideId, name, type for each slide
- Metadata is stored in a project.json file in the project folder
- No hierarchy/parent relationships yet

### User Journey
1. Complete flow → Preview
2. Click "Save Project"
3. Metadata assignment dialog appears (slide-by-slide)
4. User edits metadata for each slide
5. Click "Save"
6. Project folder created with slide files + project.json
7. Download ZIP

### Deliverables
- Metadata assignment modal/dialog
- project.json generation
- Metadata stored in project folder

### Value Provided
- Users can name their slides meaningfully
- Foundation for multi-iteration support
- Metadata enables future search/filtering

---

## Phase 3: Hierarchy Definition UI (Weeks 5-6)

### Goal
Add parent-child relationship definition when adding to existing projects.

### What Changes
- Detect if user is adding to existing project
- Show parent dropdown in metadata form
- Allow users to link new slides to existing slides
- Update project.json with hierarchy

### User Journey
1. First iteration: Save project with slides
2. Start new flow
3. Detect existing project, show "Continue with X?" prompt
4. Upload new template, complete flow
5. Metadata form shows parent dropdown
6. User assigns parents to new slides
7. Save project (appends to existing)

### Deliverables
- Project continuation prompt
- Parent dropdown in metadata form
- Hierarchy validation
- Updated project.json structure

### Value Provided
- Users can create multi-level hierarchies
- Foundation for web app generation

---

## Phase 4: Interactive Web App Generation (Weeks 7-8)

### Goal
Auto-generate an interactive web app for browsing the slides.

### What Changes
- When saving project, generate app/ folder with web app
- App reads project.json and displays slides
- Tree navigation, search, filtering

### User Journey
1. Save project with "Package & Publish" action
2. Web app auto-generated
3. ZIP includes app/ folder
4. User opens app/index.html in browser
5. Can browse slides interactively

### Deliverables
- Web app generator
- app/index.html, app/app.js, app/styles.css
- Tree navigation component
- Search and filtering

### Value Provided
- End users can browse slides without file system
- Professional, polished experience
- Ready to share with stakeholders

---

## Phase 5: Advanced Features (Weeks 9-10)

### Goal
Add polish and advanced features.

### What Changes
- Slide thumbnails in web app
- Advanced filtering options
- Custom themes
- Slide notes/descriptions
- Export to PDF

### Deliverables
- Thumbnail generation
- Advanced filtering UI
- Theme system
- PDF export

### Value Provided
- Professional presentation tool
- Extensible architecture
- Multiple export formats

---

## Implementation Timeline

```
Phase 1 (Weeks 1-2)     ████░░░░░░░░░░░░░░░░
Phase 2 (Weeks 3-4)     ░░░░████░░░░░░░░░░░░
Phase 3 (Weeks 5-6)     ░░░░░░░░████░░░░░░░░
Phase 4 (Weeks 7-8)     ░░░░░░░░░░░░████░░░░
Phase 5 (Weeks 9-10)    ░░░░░░░░░░░░░░░░████

Total: ~10 weeks for full feature
```

---

## Phasing Benefits

✅ **Incremental Value** — Each phase ships independently  
✅ **Risk Reduction** — Smaller scope per phase  
✅ **Feedback Loop** — Get user feedback between phases  
✅ **Flexibility** — Can adjust based on learnings  
✅ **Team Parallelization** — Different teams can work on different phases  
✅ **Easier Testing** — Smaller scope per phase  
✅ **Clear Milestones** — Visible progress  

---

## Phase 1 Success Criteria

- ✅ Users can save projects as folders instead of single files
- ✅ Each slide is a separate HTML file
- ✅ Project folder can be downloaded as ZIP
- ✅ All E2E tests pass
- ✅ No breaking changes to existing workflows
- ✅ Ready to ship to production

---

## Next Steps

1. Approve Phase 1 design
2. Create detailed task breakdown for Phase 1
3. Assign developers
4. Begin implementation
5. After Phase 1 ships, plan Phase 2 based on feedback

---

## Notes

- Each phase is **self-contained** and can be released independently
- No metadata or hierarchy complexity in Phase 1
- Focus on **folder-based structure** as foundation
- Keep Phase 1 **simple and focused**
- Future phases build on Phase 1 foundation
