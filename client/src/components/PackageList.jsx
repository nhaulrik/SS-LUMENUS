/**
 * client/src/components/PackageList.jsx
 *
 * Phase 4C: Packaging System - Package List Component
 *
 * Displays list of created packages with download, delete, and edit options.
 */

import React, { useState, useEffect } from 'react';
import styles from './PackageList.module.css';

export default function PackageList({ chainId, onPackageSelected, onRefresh }) {
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedPackageId, setSelectedPackageId] = useState(null);

  useEffect(() => {
    loadPackages();
  }, [chainId, onRefresh]);

  async function loadPackages() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/html-flow/${chainId}/packages`);
      const data = await response.json();
      if (data.ok) {
        setPackages(data.packages || []);
      } else {
        setError(data.error || 'Failed to load packages');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDownload(pkg) {
    try {
      const response = await fetch(`/api/html-flow/${chainId}/packages/${pkg.packageId}/download`);
      if (!response.ok) {
        setError('Failed to download package');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pkg.name}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(pkg) {
    try {
      const response = await fetch(`/api/html-flow/${chainId}/packages/${pkg.packageId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.ok) {
        setPackages(packages.filter(p => p.packageId !== pkg.packageId));
        setDeleteConfirm(null);
      } else {
        setError(data.error || 'Failed to delete package');
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGetStats(pkg) {
    try {
      const response = await fetch(`/api/html-flow/${chainId}/packages/${pkg.packageId}/stats`);
      const data = await response.json();
      if (data.ok) {
        onPackageSelected?.(pkg, data.stats);
      } else {
        setError(data.error || 'Failed to load package stats');
      }
    } catch (err) {
      setError(err.message);
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  if (isLoading) {
    return <div className={styles.container}><div className={styles.loading}>Loading packages...</div></div>;
  }

  return (
    <div className={styles.container}>
      {error && <div className={styles.error}>{error}</div>}

      {packages.length === 0 ? (
        <div className={styles.empty}>
          <p>No packages created yet.</p>
          <p>Create your first package to get started!</p>
        </div>
      ) : (
        <div className={styles.packageList}>
          {packages.map(pkg => (
            <div key={pkg.packageId} className={styles.packageCard}>
              <div className={styles.cardHeader}>
                <div className={styles.titleSection}>
                  <h3 className={styles.packageName}>{pkg.name}</h3>
                  <span className={`${styles.status} ${styles[pkg.status]}`}>
                    {pkg.status}
                  </span>
                </div>
                <div className={styles.actions}>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleDownload(pkg)}
                    title="Download as ZIP"
                  >
                    ⬇ Download
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleGetStats(pkg)}
                    title="View details"
                  >
                    📊 Details
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => setDeleteConfirm(pkg.packageId)}
                    title="Delete package"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>

              <div className={styles.cardContent}>
                {pkg.description && (
                  <p className={styles.description}>{pkg.description}</p>
                )}

                <div className={styles.metadata}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Created:</span>
                    <span className={styles.metaValue}>{formatDate(pkg.createdAt)}</span>
                  </div>

                  {pkg.metadata.author && (
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Author:</span>
                      <span className={styles.metaValue}>{pkg.metadata.author}</span>
                    </div>
                  )}

                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Version:</span>
                    <span className={styles.metaValue}>{pkg.metadata.version}</span>
                  </div>

                  {pkg.metadata.tags && pkg.metadata.tags.length > 0 && (
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Tags:</span>
                      <div className={styles.tags}>
                        {pkg.metadata.tags.map(tag => (
                          <span key={tag} className={styles.tag}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {pkg.stats && (
                  <div className={styles.stats}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Slides:</span>
                      <span className={styles.statValue}>{pkg.stats.totalSlides}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Size:</span>
                      <span className={styles.statValue}>{pkg.stats.totalSize}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Depth:</span>
                      <span className={styles.statValue}>{pkg.stats.treeDepth}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Files:</span>
                      <span className={styles.statValue}>{pkg.stats.fileCount}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Delete confirmation */}
              {deleteConfirm === pkg.packageId && (
                <div className={styles.deleteConfirm}>
                  <p>Are you sure you want to delete this package?</p>
                  <div className={styles.deleteButtons}>
                    <button
                      className={styles.confirmButton}
                      onClick={() => handleDelete(pkg)}
                    >
                      Yes, Delete
                    </button>
                    <button
                      className={styles.cancelButton}
                      onClick={() => setDeleteConfirm(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
