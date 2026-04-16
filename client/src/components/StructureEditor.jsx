/**
 * StructureEditor — Three-step wizard for creating new structures
 *
 * Steps:
 * 1. Name the structure
 * 2. Select exports to include
 * 3. Review and create
 */

import { useState, useEffect } from 'react';
import styles from './StructureEditor.module.css';

const StructureEditor = ({ chainId, onStructureCreated, onCancel, setToast }) => {
  const [step, setStep] = useState(1);
  const [structureName, setStructureName] = useState('');
  const [exports, setExports] = useState([]);
  const [selectedExports, setSelectedExports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Load exports on mount
  useEffect(() => {
    loadExports();
  }, [chainId]);

  const loadExports = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/html-flow/${chainId}/exports`);
      const result = await response.json();

      if (!result.ok) {
        setToast({ type: 'error', message: result.error || 'Failed to load exports' });
        return;
      }

      setExports(result.exports || []);
      // Pre-select all exports by default
      if (result.exports) {
        setSelectedExports(result.exports.map(e => e.id));
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportToggle = (exportId) => {
    setSelectedExports(prev =>
      prev.includes(exportId)
        ? prev.filter(id => id !== exportId)
        : [...prev, exportId]
    );
  };

  const handleCreate = async () => {
    if (!structureName.trim()) {
      setToast({ type: 'error', message: 'Please enter a structure name' });
      return;
    }

    if (selectedExports.length === 0) {
      setToast({ type: 'error', message: 'Please select at least one export' });
      return;
    }

    setIsCreating(true);
    try {
      // Pass the selected export IDs to the callback
      await onStructureCreated(structureName, selectedExports);
    } finally {
      setIsCreating(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return structureName.trim().length > 0;
    if (step === 2) return selectedExports.length > 0;
    return true;
  };

  const handleNext = () => {
    if (canProceed() && step < 3) {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.editorContainer}>
      {/* Progress indicator */}
      <div className={styles.progress}>
        <div className={`${styles.step} ${step >= 1 ? styles.active : ''}`}>
          <div className={styles.stepNumber}>1</div>
          <div className={styles.stepLabel}>Name</div>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          />
        </div>
        <div className={`${styles.step} ${step >= 2 ? styles.active : ''}`}>
          <div className={styles.stepNumber}>2</div>
          <div className={styles.stepLabel}>Exports</div>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          />
        </div>
        <div className={`${styles.step} ${step >= 3 ? styles.active : ''}`}>
          <div className={styles.stepNumber}>3</div>
          <div className={styles.stepLabel}>Review</div>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {isLoading && step === 2 ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading exports...</p>
          </div>
        ) : step === 1 ? (
          <div className={styles.stepContent}>
            <h3>Name Your Structure</h3>
            <p className={styles.description}>
              Give your slide organization a descriptive name
            </p>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g., Executive Summary, Q1 Review, Technical Deep Dive"
              value={structureName}
              onChange={e => setStructureName(e.target.value)}
              autoFocus
            />
          </div>
        ) : step === 2 ? (
          <div className={styles.stepContent}>
            <h3>Select Exports</h3>
            <p className={styles.description}>
              Choose which exports to include in this structure
            </p>
            {exports.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No exports available. Create an export first.</p>
              </div>
            ) : (
              <div className={styles.exportsList}>
                {exports.map(exp => (
                  <label key={exp.id} className={styles.exportItem}>
                    <input
                      type="checkbox"
                      checked={selectedExports.includes(exp.id)}
                      onChange={() => handleExportToggle(exp.id)}
                    />
                    <div className={styles.exportInfo}>
                      <div className={styles.exportName}>{exp.name}</div>
                      <div className={styles.exportMeta}>
                        {exp.slideCount} slides • {new Date(exp.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.stepContent}>
            <h3>Review & Create</h3>
            <p className={styles.description}>
              Confirm your structure details
            </p>
            <div className={styles.reviewBox}>
              <div className={styles.reviewItem}>
                <label>Structure Name</label>
                <div className={styles.reviewValue}>{structureName}</div>
              </div>
              <div className={styles.reviewItem}>
                <label>Exports ({selectedExports.length})</label>
                <div className={styles.reviewValue}>
                  {exports
                    .filter(e => selectedExports.includes(e.id))
                    .map(e => e.name)
                    .join(', ')}
                </div>
              </div>
              <div className={styles.reviewItem}>
                <label>Total Slides</label>
                <div className={styles.reviewValue}>
                  {exports
                    .filter(e => selectedExports.includes(e.id))
                    .reduce((sum, e) => sum + (e.slideCount || 0), 0)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={styles.secondaryButton}
          onClick={onCancel}
          disabled={isCreating}
        >
          Cancel
        </button>

        {step > 1 && (
          <button
            className={styles.secondaryButton}
            onClick={handlePrev}
            disabled={isCreating}
          >
            Back
          </button>
        )}

        {step < 3 ? (
          <button
            className={styles.primaryButton}
            onClick={handleNext}
            disabled={!canProceed() || isCreating}
          >
            Next
          </button>
        ) : (
          <button
            className={styles.primaryButton}
            onClick={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Structure'}
          </button>
        )}
      </div>
    </div>
  );
};

export default StructureEditor;
