import { useState, useRef, useCallback } from 'react'
import styles from './TreeBuilder.module.css'

// ── Helpers ────────────────────────────────────────────────────────────────────

function flattenTree(tree, slides, depth = 0, parentId = null) {
  const result = []
  for (const node of tree) {
    const slide = slides.find(s => s.id === node.slideRefId)
    result.push({ node, slide, depth, parentId })
    if (node.children && node.children.length > 0) {
      result.push(...flattenTree(node.children, slides, depth + 1, node.slideRefId))
    }
  }
  return result
}

function removeFromTree(tree, slideRefId) {
  return tree
    .filter(n => n.slideRefId !== slideRefId)
    .map(n => ({ ...n, children: removeFromTree(n.children || [], slideRefId) }))
}

function nestUnderParent(tree, childIds, parentId) {
  // Remove children from their current positions
  let newTree = tree
  const childNodes = []
  for (const id of childIds) {
    const found = findNode(newTree, id)
    if (found) childNodes.push(found)
    newTree = removeFromTree(newTree, id)
  }
  // Insert under parent
  return insertUnderParent(newTree, parentId, childNodes)
}

function findNode(tree, slideRefId) {
  for (const node of tree) {
    if (node.slideRefId === slideRefId) return node
    const found = findNode(node.children || [], slideRefId)
    if (found) return found
  }
  return null
}

function insertUnderParent(tree, parentId, childNodes) {
  return tree.map(node => {
    if (node.slideRefId === parentId) {
      return { ...node, children: [...(node.children || []), ...childNodes] }
    }
    return { ...node, children: insertUnderParent(node.children || [], parentId, childNodes) }
  })
}

function moveToRoot(tree, slideRefIds, afterId = null) {
  const nodes = []
  let newTree = tree
  for (const id of slideRefIds) {
    const found = findNode(newTree, id)
    if (found) nodes.push(found)
    newTree = removeFromTree(newTree, id)
  }
  if (afterId === null) {
    return [...newTree, ...nodes]
  }
  const idx = newTree.findIndex(n => n.slideRefId === afterId)
  if (idx === -1) return [...newTree, ...nodes]
  return [...newTree.slice(0, idx + 1), ...nodes, ...newTree.slice(idx + 1)]
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function TreeBuilder({ slides, tree, onChange, onSave }) {
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [settingParentMode, setSettingParentMode] = useState(false)
  const [dragOverId, setDragOverId] = useState(null) // node being dragged over
  const [dragOverZone, setDragOverZone] = useState(null) // 'before' | 'into' | 'after'
  const dragSourceIds = useRef(new Set())

  const flat = flattenTree(tree, slides)

  const toggleSelect = useCallback((id, event) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (event?.shiftKey && prev.size > 0) {
        // Shift-click: select range
        const flatIds = flat.map(f => f.node.slideRefId)
        const lastSelected = [...prev].pop()
        const fromIdx = flatIds.indexOf(lastSelected)
        const toIdx = flatIds.indexOf(id)
        const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx]
        for (let i = start; i <= end; i++) next.add(flatIds[i])
      } else {
        if (next.has(id)) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }, [flat])

  const handleRemove = useCallback((slideRefId) => {
    const newTree = removeFromTree(tree, slideRefId)
    const newSlides = slides.filter(s => s.id !== slideRefId)
    onChange(newSlides, newTree)
  }, [tree, slides, onChange])

  const handleSetParent = useCallback((parentId) => {
    if (!settingParentMode || selectedIds.size === 0) return
    const childIds = [...selectedIds].filter(id => id !== parentId)
    const newTree = nestUnderParent(tree, childIds, parentId)
    onChange(slides, newTree)
    setSelectedIds(new Set())
    setSettingParentMode(false)
  }, [settingParentMode, selectedIds, tree, slides, onChange])

  // ── Drag and drop ──────────────────────────────────────────────────────────

  const handleDragStart = useCallback((e, slideRefId) => {
    // If the dragged node is not in selection, make it the only selection
    if (!selectedIds.has(slideRefId)) {
      setSelectedIds(new Set([slideRefId]))
      dragSourceIds.current = new Set([slideRefId])
    } else {
      dragSourceIds.current = new Set(selectedIds)
    }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', slideRefId)
  }, [selectedIds])

  const handleDragOver = useCallback((e, targetId, zone) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(targetId)
    setDragOverZone(zone)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverId(null)
    setDragOverZone(null)
  }, [])

  const handleDrop = useCallback((e, targetId, zone) => {
    e.preventDefault()
    setDragOverId(null)
    setDragOverZone(null)
    const sourceIds = [...dragSourceIds.current]
    if (sourceIds.includes(targetId)) return // can't drop on self

    let newTree
    if (zone === 'into') {
      newTree = nestUnderParent(tree, sourceIds, targetId)
    } else {
      newTree = moveToRoot(tree, sourceIds, zone === 'after' ? targetId : null)
    }
    onChange(slides, newTree)
    setSelectedIds(new Set())
  }, [tree, slides, onChange])

  const handleDragEnd = useCallback(() => {
    setDragOverId(null)
    setDragOverZone(null)
    dragSourceIds.current = new Set()
  }, [])

  if (slides.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Tree Builder</span>
        </div>
        <div className={styles.emptyState}>
          <p>Select slides from the catalog above and click <strong>Add to Tree</strong>.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>Tree Builder</span>
        <div className={styles.headerActions}>
          {selectedIds.size >= 2 && !settingParentMode && (
            <button
              className={styles.setParentBtn}
              onClick={() => setSettingParentMode(true)}
              title="Click a node to make it the parent of selected slides"
            >
              Set Parent…
            </button>
          )}
          {settingParentMode && (
            <button className={styles.cancelBtn} onClick={() => setSettingParentMode(false)}>
              Cancel
            </button>
          )}
          <button
            className={styles.saveBtn}
            onClick={() => onSave(slides, tree)}
            title="Save tree"
          >
            Save
          </button>
        </div>
      </div>

      {settingParentMode && (
        <div className={styles.setParentHint}>
          Click any node to make it the parent of {selectedIds.size} selected slides
        </div>
      )}

      <div className={styles.treeList} role="tree">
        {flat.map(({ node, slide, depth }) => {
          const isSelected = selectedIds.has(node.slideRefId)
          const isDragTarget = dragOverId === node.slideRefId
          return (
            <div
              key={node.slideRefId}
              className={`${styles.treeRow} ${isSelected ? styles.selected : ''} ${settingParentMode ? styles.parentTarget : ''}`}
              style={{ paddingLeft: `${16 + depth * 24}px` }}
              role="treeitem"
              aria-selected={isSelected}
            >
              {/* Drop zone: before */}
              <div
                className={`${styles.dropZoneBefore} ${isDragTarget && dragOverZone === 'before' ? styles.dropActive : ''}`}
                onDragOver={e => handleDragOver(e, node.slideRefId, 'before')}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, node.slideRefId, 'before')}
              />

              {/* Node content */}
              <div
                className={styles.nodeContent}
                draggable
                onDragStart={e => handleDragStart(e, node.slideRefId)}
                onDragEnd={handleDragEnd}
                onClick={e => settingParentMode ? handleSetParent(node.slideRefId) : toggleSelect(node.slideRefId, e)}
              >
                <span className={styles.dragHandle} aria-hidden="true">⠿</span>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={isSelected}
                  onChange={e => { e.stopPropagation(); toggleSelect(node.slideRefId, e) }}
                  onClick={e => e.stopPropagation()}
                  aria-label={`Select ${slide?.title || node.slideRefId}`}
                />
                <span className={styles.depthIndicator} aria-hidden="true">
                  {'└ '.repeat(depth)}
                </span>
                <span className={styles.nodeTitle}>{slide?.title || node.slideRefId}</span>
                <span className={styles.nodeMeta}>{slide?.exportId} · {slide?.slideIndex}</span>
                <button
                  className={styles.removeBtn}
                  onClick={e => { e.stopPropagation(); handleRemove(node.slideRefId) }}
                  aria-label={`Remove ${slide?.title || node.slideRefId} from tree`}
                  title="Remove"
                >
                  ×
                </button>
              </div>

              {/* Drop zone: into (nest as child) */}
              <div
                className={`${styles.dropZoneInto} ${isDragTarget && dragOverZone === 'into' ? styles.dropActive : ''}`}
                onDragOver={e => handleDragOver(e, node.slideRefId, 'into')}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, node.slideRefId, 'into')}
              >
                <span className={styles.dropZoneLabel}>Drop here to nest under this slide</span>
              </div>
            </div>
          )
        })}
      </div>

      {selectedIds.size > 0 && !settingParentMode && (
        <div className={styles.selectionToolbar}>
          <span>{selectedIds.size} selected</span>
          <button
            className={styles.setParentBtnInline}
            onClick={() => setSettingParentMode(true)}
          >
            Set Parent
          </button>
          <button
            className={styles.deselectBtn}
            onClick={() => setSelectedIds(new Set())}
          >
            Deselect all
          </button>
        </div>
      )}
    </div>
  )
}
