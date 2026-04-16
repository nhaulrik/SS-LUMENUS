import { useState, useRef } from 'react'
import styles from './TemplateUploadDialog.module.css'

/**
 * TemplateUploadDialog
 * 
 * Dialog for uploading a new template to an existing project.
 */
export default function TemplateUploadDialog({ projectName, onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.html')) {
      setError('Only HTML files are allowed')
      return
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('File size exceeds 50MB limit')
      return
    }

    setFile(selectedFile)
    setError(null)
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

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (description.trim()) {
        formData.append('description', description.trim())
      }

      const response = await fetch(`/api/projects/${projectName}/templates`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to upload template')
      }

      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Upload Template</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.description}>
            Upload a new HTML template to add to this project.
          </p>

          <div
            className={styles.dropZone}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={styles.dropZoneContent}>
              <div className={styles.dropIcon}>📁</div>
              <h3>Drop HTML file here</h3>
              <p>or click to select</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".html"
            onChange={handleFileSelect}
            className={styles.hiddenInput}
          />

          {file && (
            <div className={styles.fileInfo}>
              <div className={styles.fileIcon}>📄</div>
              <div className={styles.fileDetails}>
                <p className={styles.fileName}>{file.name}</p>
                <p className={styles.fileSize}>{(file.size / 1024).toFixed(2)} KB</p>
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Product slide template v2"
              className={styles.textarea}
              disabled={loading}
              rows="3"
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.footer}>
          <button
            className={styles.secondaryButton}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={styles.primaryButton}
            onClick={handleUpload}
            disabled={!file || loading}
          >
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}
