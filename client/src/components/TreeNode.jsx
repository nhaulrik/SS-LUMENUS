/**
 * TreeNode — Recursive component for rendering hierarchical slide structure
 *
 * Backend Node Structure:
 * {
 *   nodeId: "node-1234567890",
 *   type: "parent" | "child",
 *   slideRef: "export-1/1",
 *   title: "Slide Title",
 *   children: ["node-xxx", "node-yyy"],
 *   parentId: null | "node-parent",
 *   createdAt: "2024-01-01T00:00:00Z"
 * }
 *
 * Features:
 * - Recursive rendering of parent-child relationships
 * - Expand/collapse toggle for child nodes
 * - Delete button on hover
 * - Drag-drop support for moving nodes
 * - Slide preview on selection
 */

import { useState } from 'react';
import styles from './TreeNode.module.css';

const TreeNode = ({
  node,
  allNodes,
  onRemove,
  onMove,
  onSelectSlide,
  availableSlides,
  draggedSlide,
  onAddSlide,
  level = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Get child nodes by looking up nodeIds in the children array
  const childNodes = (node.children || [])
    .map(childId => allNodes.find(n => n.nodeId === childId))
    .filter(Boolean);
  const hasChildren = childNodes.length > 0;

  // Node title comes directly from the node
  const nodeTitle = node.title || 'Unknown Slide';

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // Handle drop - move dragged slide under this node
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (draggedSlide) {
      // If dragging from available slides list, add as child
      if (!allNodes.find(n => n.slideRef === draggedSlide.slideRef)) {
        onAddSlide(draggedSlide, node.nodeId);
      } else {
        // If dragging from tree, move the node
        const draggedNode = allNodes.find(n => n.slideRef === draggedSlide.slideRef);
        if (draggedNode) {
          onMove(draggedNode.nodeId, node.nodeId);
        }
      }
    }
  };

  // Handle remove
  const handleRemove = (e) => {
    e.stopPropagation();
    onRemove(node.id);
  };

  return (
    <div className={styles.nodeContainer}>
      {/* Node itself */}
      <div
        className={`${styles.node} ${isDragOver ? styles.dragOver : ''}`}
        style={{ paddingLeft: `${level * 20}px` }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Expand/collapse toggle */}
        {hasChildren && (
          <button
            className={`${styles.expandButton} ${isExpanded ? styles.expanded : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            ▶
          </button>
        )}
        {!hasChildren && <div className={styles.expandPlaceholder} />}

        {/* Node content */}
        <div
          className={styles.nodeContent}
          onClick={() => {
            // Find the slide in available slides and select it
            const slide = availableSlides.find(s => s.slideRef === node.slideRef);
            if (slide) {
              onSelectSlide(slide);
            }
          }}
        >
          <div className={styles.slideName}>
            {nodeTitle}
          </div>
          {node.slideRef && <div className={styles.slideType}>{node.slideRef}</div>}
        </div>

        {/* Delete button on hover */}
        {isHovering && (
          <button
            className={styles.deleteButton}
            onClick={handleRemove}
            title="Remove from structure"
          >
            ✕
          </button>
        )}
      </div>

      {/* Child nodes */}
      {hasChildren && isExpanded && (
        <div className={styles.childrenContainer}>
          {childNodes.map(childNode => (
            <TreeNode
              key={childNode.nodeId}
              node={childNode}
              allNodes={allNodes}
              onRemove={onRemove}
              onMove={onMove}
              onSelectSlide={onSelectSlide}
              availableSlides={availableSlides}
              draggedSlide={draggedSlide}
              onAddSlide={onAddSlide}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TreeNode;
