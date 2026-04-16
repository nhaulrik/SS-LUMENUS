/**
 * client/src/components/CreatePackageDialog.jsx
 *
 * Phase 4C: Packaging System - Package Creation Dialog
 *
 * 4-step wizard for creating packages from structures:
 * 1. Select structure
 * 2. Configure package options
 * 3. Customize metadata (title, description, author)
 * 4. Review and create
 */

import React, { useState, useEffect } from 'react';
import styles from './CreatePackageDialog.module.css';

export default function CreatePackageDialog({ chainId, isOpen, onClose, onPackageCreated }) {
  const [step, setStep] = useState(1);
  const [structures, setStructures] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [selectedStructureId, setSelectedStructureId] = useState('');
  const [packageName, setPackageName] = useState('');
  const [packageDescription, setPackageDescription] = useState('');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [generateReadme, setGenerateReadme] = useState(true);
  const [includeManifest, setIncludeManifest] = useState(true);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [tags, setTags] = useState('');
  const [creating, setCreating] = useState(false);

  // Load structures on mount
  useEffect(() => {
    if (isOpen) {
      loadStructures();
    }
  }, [isOpen]);

  // Auto-populate title from package name
  useEffect(() => {
    if (!title && packageName) {
      setTitle(packageName);
    }
  }, [packageName, title]);

  async function loadStructures() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/html-flow/${chainId}/structures`);
      const data = await response.json();
      if (data.ok) {
        setStructures(data.structures || []);
      } else {
        setError(data.error || 'Failed to load structures');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleNext() {
    // Validate current step
    if (step === 1 && !selectedStructureId) {
      setError('Please select a structure');
      return;
    }
    if (step === 2 && !packageName) {
      setError('Please enter a package name');
      return;
    }
    if (step === 3 && !title) {
      setError('Please enter a title');
      return;
    }

    setError(null);
    setStep(step + 1);
  }

  function handlePrev() {
    setError(null);
    setStep(step - 1);
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/html-flow/${chainId}/packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: packageName,
          description: packageDescription,
          structureId: selectedStructureId,
          options: {
            includeMetadata,
            generateReadme,
            includeManifest
          }
        })
      });

      const data = await response.json();
      if (!data.ok) {
        setError(data.error || 'Failed to create package');
        setCreating(false);
        return;
      }

      // Update metadata
      const pkg = data.package;
      const updateResponse = await fetch(`/api/html-flow/${chainId}/packages/${pkg.packageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            title,
            author,
            version: '1.0',
            tags: tags.split(',').map(t => t.trim()).filter(t => t)
          }
        })
      });

      const updateData = await updateResponse.json();
      if (updateData.ok) {
        onPackageCreated?.(updateData.package);
        handleClose();
      } else {
        setError(updateData.error || 'Failed to update package metadata');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function handleClose() {
    setStep(1);
    setSelectedStructureId('');
    setPackageName('');
    setPackageDescription('');
    setTitle('');
    setAuthor('');
    setTags('');
    setError(null);
    onClose?.();
  }

  if (!isOpen) return null;

  const selectedStructure = structures.find(s => s.structureId === selectedStructureId);

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2>Create Package</h2>
          <button className={styles.closeButton} onClick={handleClose}>×</button>
        </div>

        {/* Progress indicator */}
        <div className={styles.progressBar}>
          <div className={styles.progressSteps}>
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`${styles.progressStep} ${s === step ? styles.active : ''} ${s < step ? styles.completed : ''}`}
              >
                {s < step ? '✓' : s}
              </div>
            ))}
          </div>
          <div className={styles.progressLabels}>
            <span>Structure</span>
            <span>Config</span>
            <span>Metadata</span>
            <span>Review</span>
          </div>
        </div>

        {/* Error message */}
        {error && <div className={styles.error}>{error}</div>}

        {/* Step 1: Select Structure */}
        {step === 1 && (
          <div className={styles.stepContent}>
            <h3>Select a Structure</h3>
            <p>Choose which structure to package:</p>

            {isLoading ? (
              <div className={styles.loading}>Loading structures...</div>
            ) : structures.length === 0 ? (
              <div className={styles.empty}>No structures found. Create a structure first.</div>
            ) : (
              <div className={styles.structureList}>
                {structures.map(s => (
                  <div
                    key={s.structureId}
                    className={`${styles.structureItem} ${selectedStructureId === s.structureId ? styles.selected : ''}`}
                    onClick={() => setSelectedStructureId(s.structureId)}
                  >
                    <div className={styles.structureItemHeader}>
                      <div className={styles.structureItemName}>{s.name}</div>
                      {selectedStructureId === s.structureId && <span className={styles.checkmark}>✓</span>}
                    </div>
                    <div className={styles.structureItemDesc}>{s.description}</div>
                    <div className={styles.structureItemMeta}>
                      Created: {new Date(s.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Configure Package */}
        {step === 2 && (
          <div className={styles.stepContent}>
            <h3>Configure Package</h3>

            <div className={styles.formGroup}>
              <label>Package Name *</label>
              <input
                type="text"
                placeholder="e.g., Executive Summary"
                value={packageName}
                onChange={e => setPackageName(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea
                placeholder="Brief description of the package"
                value={packageDescription}
                onChange={e => setPackageDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className={styles.optionsGroup}>
              <h4>Package Options</h4>

              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="includeManifest"
                  checked={includeManifest}
                  onChange={e => setIncludeManifest(e.target.checked)}
                />
                <label htmlFor="includeManifest">
                  Include Manifest (MANIFEST.json with structure info)
                </label>
              </div>

              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="generateReadme"
                  checked={generateReadme}
                  onChange={e => setGenerateReadme(e.target.checked)}
                />
                <label htmlFor="generateReadme">
                  Generate README (auto-generated documentation)
                </label>
              </div>

              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="includeMetadata"
                  checked={includeMetadata}
                  onChange={e => setIncludeMetadata(e.target.checked)}
                />
                <label htmlFor="includeMetadata">
                  Include Metadata (metadata.json files)
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Customize Metadata */}
        {step === 3 && (
          <div className={styles.stepContent}>
            <h3>Customize Metadata</h3>

            <div className={styles.formGroup}>
              <label>Title *</label>
              <input
                type="text"
                placeholder="Package title"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Author</label>
              <input
                type="text"
                placeholder="Your name or organization"
                value={author}
                onChange={e => setAuthor(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Tags (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g., executive, presentation, 2026"
                value={tags}
                onChange={e => setTags(e.target.value)}
              />
            </div>

            <div className={styles.infoBox}>
              <strong>Version:</strong> 1.0 (auto-generated)
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className={styles.stepContent}>
            <h3>Review Package</h3>

            <div className={styles.reviewSection}>
              <div className={styles.reviewItem}>
                <span className={styles.label}>Structure:</span>
                <span className={styles.value}>{selectedStructure?.name}</span>
              </div>

              <div className={styles.reviewItem}>
                <span className={styles.label}>Package Name:</span>
                <span className={styles.value}>{packageName}</span>
              </div>

              <div className={styles.reviewItem}>
                <span className={styles.label}>Title:</span>
                <span className={styles.value}>{title}</span>
              </div>

              <div className={styles.reviewItem}>
                <span className={styles.label}>Author:</span>
                <span className={styles.value}>{author || '(not set)'}</span>
              </div>

              <div className={styles.reviewItem}>
                <span className={styles.label}>Tags:</span>
                <span className={styles.value}>{tags || '(none)'}</span>
              </div>

              <div className={styles.reviewItem}>
                <span className={styles.label}>Include Manifest:</span>
                <span className={styles.value}>{includeManifest ? 'Yes' : 'No'}</span>
              </div>

              <div className={styles.reviewItem}>
                <span className={styles.label}>Generate README:</span>
                <span className={styles.value}>{generateReadme ? 'Yes' : 'No'}</span>
              </div>

              <div className={styles.reviewItem}>
                <span className={styles.label}>Include Metadata:</span>
                <span className={styles.value}>{includeMetadata ? 'Yes' : 'No'}</span>
              </div>
            </div>

            <div className={styles.infoBox}>
              Click "Create" to generate the package. You'll be able to download it as a ZIP file.
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <button
            className={styles.secondaryButton}
            onClick={handleClose}
            disabled={creating}
          >
            Cancel
          </button>

          {step > 1 && (
            <button
              className={styles.secondaryButton}
              onClick={handlePrev}
              disabled={creating}
            >
              Back
            </button>
          )}

          {step < 4 && (
            <button
              className={styles.primaryButton}
              onClick={handleNext}
              disabled={creating}
            >
              Next
            </button>
          )}

          {step === 4 && (
            <button
              className={styles.primaryButton}
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Package'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
