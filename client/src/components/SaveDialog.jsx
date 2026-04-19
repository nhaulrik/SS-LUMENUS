import styles from './SaveDialog.module.css'

/**
 * SaveDialog
 *
 * Modal dialog for choosing between patching current export
 * or creating a new export.
 */
export default function SaveDialog({ onPatch, onFork, onCancel }) {
  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h3>Save Changes</h3>
        <p>How would you like to save your changes?</p>

        <div className={styles.options}>
          <button className={styles.optionButton} onClick={onPatch}>
            <div className={styles.optionTitle}>Patch Current Export</div>
            <div className={styles.optionDescription}>
              Overwrite the slide in the current export
            </div>
          </button>

          <button className={styles.optionButton} onClick={onFork}>
            <div className={styles.optionTitle}>Create New Export</div>
            <div className={styles.optionDescription}>
              Fork selected slides into a new export
            </div>
          </button>
        </div>

        <div className={styles.modalButtons}>
          <button className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
