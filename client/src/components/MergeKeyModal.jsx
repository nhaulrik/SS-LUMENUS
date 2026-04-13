import { useState } from 'react'

/**
 * Modal for merging elements that share the same shape across slides
 * but have been tagged with different keys.
 *
 * Props:
 *   sourceTag      – the tag the user initiated the merge from
 *   candidates     – array of { tag, element, slideIndex } from other slides
 *                    with the same shapeName but a different key
 *   onMerge(ids)   – called with array of elementIds to rename to sourceTag.key
 *   onClose()      – dismiss without saving
 */
export default function MergeKeyModal({ sourceTag, candidates, onMerge, onClose }) {
  // Pre-check candidates whose original text matches the source tag exactly
  const [checked, setChecked] = useState(
    () => new Set(
      candidates
        .filter(c => c.tag.originalText === sourceTag.originalText)
        .map(c => c.tag.elementId)
    )
  )

  const toggleAll = () => {
    if (checked.size === candidates.length) {
      setChecked(new Set())
    } else {
      setChecked(new Set(candidates.map(c => c.tag.elementId)))
    }
  }

  const toggle = (id) => {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleMerge = () => {
    const selected = candidates
      .filter(c => checked.has(c.tag.elementId))
      .map(c => c.tag.elementId)
    if (selected.length > 0) onMerge(selected)
    onClose()
  }

  const allChecked  = checked.size === candidates.length
  const noneChecked = checked.size === 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content merge-modal" onClick={e => e.stopPropagation()}>

        <h3 className="merge-modal-title">
          Merge into <code className="propagate-key-pill">{sourceTag.key}</code>
        </h3>

        <p className="merge-modal-description">
          The shape <strong>&ldquo;{candidates[0]?.element?.shapeName}&rdquo;</strong> appears
          on {candidates.length} other slide{candidates.length !== 1 ? 's' : ''} with
          different keys. Select which slides to rename to{' '}
          <code className="propagate-key-pill">{sourceTag.key}</code>.
        </p>

        <div className="merge-candidate-list">
          {/* Header */}
          <div className="merge-candidate-header">
            <label className="merge-select-all">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={toggleAll}
              />
              <span>Select all</span>
            </label>
            <span className="merge-col-slide">Slide</span>
            <span className="merge-col-key">Current key</span>
            <span className="merge-col-text">Element text</span>
          </div>

          {candidates.map(({ tag, element, slideIndex }) => {
            const isChecked    = checked.has(tag.elementId)
            const textMatches  = tag.originalText === sourceTag.originalText

            return (
              <label
                key={tag.elementId}
                className={`merge-candidate-item${isChecked ? ' merge-candidate-item--checked' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(tag.elementId)}
                />
                <span className="merge-col-slide">{slideIndex}</span>
                <span className="merge-col-key">
                  <code className="propagate-key-pill">{tag.key}</code>
                </span>
                <span className="merge-col-text">
                  {tag.originalText || element?.text || '—'}
                  {!textMatches && (
                    <span className="merge-text-differs" title="Text differs from source element">
                      {' '}⚠
                    </span>
                  )}
                </span>
              </label>
            )
          })}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            data-testid="merge-confirm"
            onClick={handleMerge}
            disabled={noneChecked}
          >
            Merge {checked.size > 0 ? `(${checked.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
