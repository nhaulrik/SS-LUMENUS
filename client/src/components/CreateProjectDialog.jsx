import { useState, useRef } from 'react'
import styles from './CreateProjectDialog.module.css'

/**
 * CreateProjectDialog
 * 
 * Dialog for creating a new project by uploading an HTML template.
 * Allows user to:
 * 1. Upload an HTML file
 * 2. Optionally specify a project name
 * 3. Create the project and initial flow
 */
export default function CreateProjectDialog({ onClose, onProjectCreated }) {
  const [step, setStep] = useState('upload') // 'upload' or 'confirm'
  const [file, setFile] = useState(null)
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    if (!selectedFile.name.endsWith('.html')) {
      setError('Only HTML files are allowed')
      return
    }

    // Validate file size (50MB limit)
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('File size exceeds 50MB limit')
      return
    }

    setFile(selectedFile)
    setError(null)
    // Auto-populate project name from filename
    const nameWithoutExt = selectedFile.name.replace(/\.[^.]+$/, '')
    setProjectName(nameWithoutExt)
    setStep('confirm')
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      handleFileSelect({ target: { files: [droppedFile] } })
    }
  }

  const handleCreateProject = async () => {
    if (!file || !projectName.trim()) {
      setError('Project name and file are required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectName', projectName.trim())

      const response = await fetch('/api/projects', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create project')
      }

      const data = await response.json()
      onProjectCreated(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('upload')
      setFile(null)
      setError(null)
    } else {
      onClose()
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Create New Project</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {step === 'upload' ? (
            // Upload Step
            <div className={styles.uploadSection}>
              <p className={styles.description}>
                Upload an HTML template to start your project. The template should contain the slide structure you want to work with.
              </p>

              <div
                className={styles.dropZone}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={styles.dropZoneContent}>
                  <div className={styles.dropIcon}>📁</div>
                  <h3>Drop your HTML file here</h3>
                  <p>or click to select</p>
                  <p className={styles.fileHint}>.html files up to 50MB</p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".html"
                onChange={handleFileSelect}
                className={styles.hiddenInput}
              />

              {error && <div className={styles.error}>{error}</div>}
            </div>
          ) : (
            // Confirm Step
            <div className={styles.confirmSection}>
              <div className={styles.fileInfo}>
                <div className={styles.fileIcon}>📄</div>
                <div className={styles.fileDetails}>
                  <p className={styles.fileName}>{file?.name}</p>
                  <p className={styles.fileSize}>
                    {(file?.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="projectName" className={styles.label}>
                  Project Name
                </label>
                <input
                  id="projectName"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., My Presentation"
                  className={styles.input}
                  disabled={loading}
                />
                <p className={styles.fieldHint}>
                  Use alphanumeric characters, hyphens, and underscores
                </p>
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.infoBox}>
                <p className={styles.infoText}>
                  ℹ️ A new project will be created with this template. You'll be able to upload additional templates and create multiple flows later.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            className={styles.secondaryButton}
            onClick={handleBack}
            disabled={loading}
          >
            {step === 'confirm' ? 'Back' : 'Cancel'}
          </button>

          {step === 'upload' ? (
            <button
              className={styles.primaryButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={!file || loading}
            >
              {file ? 'Change File' : 'Select File'}
            </button>
          ) : (
            <button
              className={styles.primaryButton}
              onClick={handleCreateProject}
              disabled={!projectName.trim() || loading}
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
