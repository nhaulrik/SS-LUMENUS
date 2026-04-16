/**
 * RelationshipBuilder — Phase 4B: Independent Workflow for Organizing Slides
 *
 * Main container component that manages:
 * - Structure selection/creation
 * - Tree-based slide organization (left panel)
 * - Available slides and preview (right panel)
 * - Drag-drop interactions between panels
 * - Saving/loading structures
 *
 * Backend API Contract:
 * - Structures are created from selected exports
 * - Nodes contain slideRef (exportId/slideIndex) and title
 * - Tree operations: add_node, move_node, remove_node
 * - Orphaned slides tracked automatically
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────┐
 * │ Header: Structure selector & actions                │
 * ├──────────────────────┬──────────────────────────────┤
 * │ Left: Tree Canvas    │ Right: Slides + Preview      │
 * │ - Drag drop zone     │ - Available slides (drag)     │
 * │ - Hierarchical tree  │ - Slide preview              │
 * │ - Delete nodes       │                              │
 * │ - Orphaned slides    │                              │
 * └──────────────────────┴──────────────────────────────┘
 */

import { useState, useCallback, useEffect } from 'react';
import styles from './RelationshipBuilder.module.css';
import StructureEditor from './StructureEditor';
import TreeNode from './TreeNode';
import SlidePreview from './SlidePreview';

const RelationshipBuilder = ({ chainId, onClose, setToast }) => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [structures, setStructures] = useState([]);
  const [currentStructure, setCurrentStructure] = useState(null);
  const [selectedSlide, setSelectedSlide] = useState(null);
  const [availableSlides, setAvailableSlides] = useState([]);
  const [orphanedSlides, setOrphanedSlides] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [draggedSlide, setDraggedSlide] = useState(null);
  const [exports, setExports] = useState([]);

  // ── Load structures on mount ───────────────────────────────────────────────
  useEffect(() => {
    loadStructures();
    loadExports();
  }, [chainId]);

  // ── Load structures from server ────────────────────────────────────────────
  const loadStructures = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/html-flow/${chainId}/structures`);
      const result = await response.json();

      if (!result.ok) {
        setToast({ type: 'error', message: result.error || 'Failed to load structures' });
        return;
      }

      setStructures(result.structures || []);
      if (result.structures && result.structures.length > 0) {
        selectStructure(result.structures[0]);
      }
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [chainId, setToast]);

  // ── Load available exports ─────────────────────────────────────────────────
  const loadExports = useCallback(async () => {
    try {
      const response = await fetch(`/api/html-flow/${chainId}/exports`);
      const result = await response.json();

      if (!result.ok) {
        return;
      }

      setExports(result.exports || []);
    } catch (err) {
      // Silently fail - exports are optional
    }
  }, [chainId]);

  // ── Select a structure and load its details ────────────────────────────────
  const selectStructure = useCallback(async (structure) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/html-flow/${chainId}/structures/${structure.structureId}`);
      const result = await response.json();

      if (!result.ok) {
        setToast({ type: 'error', message: result.error || 'Failed to load structure' });
        return;
      }

      setCurrentStructure(result.structure);
      setSelectedSlide(null);

      // Load orphaned slides
      const orphansResponse = await fetch(
        `/api/html-flow/${chainId}/structures/${structure.structureId}/orphans`
      );
      const orphansResult = await orphansResponse.json();
      if (orphansResult.ok) {
        setOrphanedSlides(orphansResult.orphans || []);
      }

      // Build available slides from structure's exports
      buildAvailableSlides(result.structure);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  }, [chainId, setToast]);

  // ── Build available slides from structure's exports ────────────────────────
  const buildAvailableSlides = useCallback((structure) => {
    try {
      const allSlides = [];
      
      // For each export in the structure, generate slide references
      if (structure.sources && structure.sources.exports) {
        structure.sources.exports.forEach(exportRef => {
          for (let i = 1; i <= exportRef.slideCount; i++) {
            allSlides.push({
              slideRef: `${exportRef.exportId}/${i}`,
              exportId: exportRef.exportId,
              slideIndex: i,
              title: `Slide ${i}`, // Will be enhanced by backend
            });
          }
        });
      }

      setAvailableSlides(allSlides);
    } catch (err) {
      // Silently fail
    }
  }, []);

  // ── Add a slide to the structure ────────────────────────────────────────────
  const handleAddSlide = useCallback(async (slide, parentId = null) => {
    if (!currentStructure) return;

    try {
      const response = await fetch(`/api/html-flow/${chainId}/structures/${currentStructure.structureId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'add_node',
          slideRef: slide.slideRef,
          title: slide.title,
          parentId: parentId || null,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        setToast({ type: 'error', message: result.error || 'Failed to add slide' });
        return;
      }

      setCurrentStructure(result.structure);
      setToast({ type: 'success', message: `Added ${slide.title} to structure` });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  }, [chainId, currentStructure, setToast]);

  // ── Move a node in the structure ────────────────────────────────────────────
  const handleMoveNode = useCallback(async (nodeId, newParentId = null) => {
    if (!currentStructure) return;

    try {
      const response = await fetch(`/api/html-flow/${chainId}/structures/${currentStructure.structureId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'move_node',
          nodeId,
          newParentId: newParentId || null,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        setToast({ type: 'error', message: result.error || 'Failed to move node' });
        return;
      }

      setCurrentStructure(result.structure);
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  }, [chainId, currentStructure, setToast]);

  // ── Remove a node from the structure ────────────────────────────────────────
  const handleRemoveNode = useCallback(async (nodeId) => {
    if (!currentStructure) return;

    try {
      const response = await fetch(`/api/html-flow/${chainId}/structures/${currentStructure.structureId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'remove_node',
          nodeId,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        setToast({ type: 'error', message: result.error || 'Failed to remove node' });
        return;
      }

      setCurrentStructure(result.structure);
      setSelectedSlide(null);
      setToast({ type: 'success', message: 'Slide removed from structure' });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  }, [chainId, currentStructure, setToast]);

  // ── Create a new structure ─────────────────────────────────────────────────
  const handleCreateStructure = useCallback(async (structureName, selectedExportIds) => {
    try {
      const response = await fetch(`/api/html-flow/${chainId}/structures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: structureName,
          description: '',
          exportIds: selectedExportIds,
        }),
      });

      const result = await response.json();

      if (!result.ok) {
        setToast({ type: 'error', message: result.error || 'Failed to create structure' });
        return;
      }

      // Reload structures and select the new one
      await loadStructures();
      setShowEditor(false);
      setToast({ type: 'success', message: `Structure "${structureName}" created` });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  }, [chainId, loadStructures, setToast]);

  // ── Delete a structure ─────────────────────────────────────────────────────
  const handleDeleteStructure = useCallback(async (structureId) => {
    if (!window.confirm('Are you sure you want to delete this structure?')) {
      return;
    }

    try {
      const response = await fetch(`/api/html-flow/${chainId}/structures/${structureId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.ok) {
        setToast({ type: 'error', message: result.error || 'Failed to delete structure' });
        return;
      }

      await loadStructures();
      setCurrentStructure(null);
      setToast({ type: 'success', message: 'Structure deleted' });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
  }, [chainId, loadStructures, setToast]);

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = (e, slide) => {
    setDraggedSlide(slide);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggedSlide(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (isLoading && !currentStructure) {
    return (
      <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
        <div className={styles.dialog}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p>Loading structures...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.dialog}>
        {/* Header with structure selector and actions */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h2 className={styles.title}>Relationship Builder</h2>
            <p className={styles.subtitle}>Organize slides hierarchically</p>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Structure selector */}
        {!showEditor && currentStructure && (
          <div className={styles.structureBar}>
            <div className={styles.structureInfo}>
              <select
                className={styles.structureSelect}
                value={currentStructure.structureId}
                onChange={e => {
                  const struct = structures.find(s => s.structureId === e.target.value);
                  if (struct) selectStructure(struct);
                }}
              >
                {structures.map(s => (
                  <option key={s.structureId} value={s.structureId}>
                    {s.name}
                  </option>
                ))}
              </select>
              <span className={styles.structureDate}>
                Created: {new Date(currentStructure.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className={styles.structureActions}>
              <button
                className={styles.actionButton}
                onClick={() => setShowEditor(true)}
                title="Create new structure"
              >
                + New Structure
              </button>
              <button
                className={styles.actionButton}
                onClick={() => handleDeleteStructure(currentStructure.structureId)}
                title="Delete this structure"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Editor view (step-by-step structure creation) */}
        {showEditor && (
          <StructureEditor
            chainId={chainId}
            onStructureCreated={handleCreateStructure}
            onCancel={() => setShowEditor(false)}
            setToast={setToast}
          />
        )}

        {/* Main content: Tree + Slides panel */}
        {!showEditor && currentStructure && (
          <div className={styles.content}>
            {/* Left: Tree canvas */}
            <div className={styles.leftPanel}>
              <div className={styles.panelHeader}>
                <h3>Slide Organization</h3>
              </div>

              <div className={styles.treeContainer}>
                {currentStructure.tree && currentStructure.tree.nodes && currentStructure.tree.nodes.length > 0 ? (
                  <div className={styles.treeCanvas}>
                    {currentStructure.tree.nodes
                      .filter(n => !n.parentId) // Root nodes only
                      .map(rootNode => (
                        <TreeNode
                          key={rootNode.nodeId}
                          node={rootNode}
                          allNodes={currentStructure.tree.nodes}
                          onRemove={handleRemoveNode}
                          onMove={handleMoveNode}
                          onSelectSlide={setSelectedSlide}
                          availableSlides={availableSlides}
                          draggedSlide={draggedSlide}
                          onAddSlide={handleAddSlide}
                        />
                      ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <p>No slides added yet</p>
                    <p className={styles.hint}>Drag slides from the right panel to add them</p>
                  </div>
                )}
              </div>

              {/* Orphaned slides section */}
              {orphanedSlides && orphanedSlides.length > 0 && (
                <div className={styles.orphanedSection}>
                  <h4>Orphaned Slides ({orphanedSlides.length})</h4>
                  <div className={styles.orphanedList}>
                    {orphanedSlides.map(slide => (
                      <div
                        key={slide.slideId}
                        className={styles.orphanedSlide}
                        onClick={() => handleAddSlide(slide)}
                        title="Click to add to root"
                      >
                        {slide.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Available slides + Preview */}
            <div className={styles.rightPanel}>
              {/* Available slides */}
              <div className={styles.slidesSection}>
                <div className={styles.panelHeader}>
                  <h3>Available Slides ({availableSlides.length})</h3>
                </div>
                <div className={styles.slidesList}>
                  {availableSlides.map(slide => (
                    <div
                      key={slide.slideRef}
                      className={`${styles.slideItem} ${
                        selectedSlide?.slideRef === slide.slideRef ? styles.selected : ''
                      } ${draggedSlide?.slideRef === slide.slideRef ? styles.dragging : ''}`}
                      draggable
                      onDragStart={e => handleDragStart(e, slide)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedSlide(slide)}
                    >
                      <div className={styles.slideItemContent}>
                        <div className={styles.slideName}>{slide.title}</div>
                        <div className={styles.slideType}>{slide.slideRef}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slide preview */}
              {selectedSlide && (
                <SlidePreview
                  slide={selectedSlide}
                  onClose={() => setSelectedSlide(null)}
                />
              )}
            </div>
          </div>
        )}

        {/* No structures state */}
        {!showEditor && !currentStructure && (
          <div className={styles.emptyContent}>
            <div className={styles.emptyStateContent}>
              <h3>No structures yet</h3>
              <p>Create a structure to start organizing your slides</p>
              <button
                className={styles.primaryButton}
                onClick={() => setShowEditor(true)}
              >
                Create First Structure
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RelationshipBuilder;
