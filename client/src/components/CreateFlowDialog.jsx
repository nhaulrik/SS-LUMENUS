import { useState } from 'react'
import styles from './CreateFlowDialog.module.css'

/**
 * CreateFlowDialog
 * 
 * Dialog for creating a new flow from an existing template.
 */
export default function CreateFlowDialog({ projectName, template, onClose, onSuccess }) {
  const [variant, setVariant] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCreate = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectName}/flows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.templateId,
          variant: variant.trim() || undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create flow')
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
          <h2 className={styles.title}>Create New Flow</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.templateInfo}>
            <div className={styles.templateIcon}>📋</div>
            <div className={styles.templateDetails}>
              <p className={styles.templateLabel}>Template</p>
              <p className={styles.templateName}>{template.filename}</p>
            </div>
          </div>

          <p className={styles.description}>
            A new flow will be created from this template. You can then upload the template in the flow workspace and start assigning zones.
          </p>

          <div className={styles.formGroup}>
            <label htmlFor="variant" className={styles.label}>
              Variant (optional)
            </label>
            <input
              id="variant"
              type="text"
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              placeholder="e.g., v2, test, experiment"
              className={styles.input}
              disabled={loading}
            />
            <p className={styles.fieldHint}>
              If provided, will be appended to the flow name (e.g., flow-template-v2)
            </p>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.infoBox}>
            <p className={styles.infoText}>
              ℹ️ You can create multiple flows from the same template for A/B testing or different variations.
            </p>
          </div>
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
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Flow'}
          </button>
        </div>
      </div>
    </div>
  )
}
