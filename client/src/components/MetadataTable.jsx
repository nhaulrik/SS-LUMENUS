/**
 * MetadataTable — Interactive table for assigning slide metadata.
 *
 * Features:
 * - One row per slide
 * - Direct inline editing
 * - Hover to preview slide
 * - Click to select slide
 * - Real-time validation with error display
 * - Keyboard navigation support
 */

import { useCallback } from 'react'

const SLIDE_TYPES = [
  { value: 'content', label: 'Content' },
  { value: 'title', label: 'Title' },
  { value: 'conclusion', label: 'Conclusion' },
  { value: 'other', label: 'Other' },
]

export default function MetadataTable({
  metadata,
  errors = {},
  selectedSlideIndex,
  hoveredSlideIndex,
  onMetadataChange,
  onRowHover,
  onRowClick,
}) {
  const handleCellChange = useCallback(
    (slideIndex, field, value) => {
      onMetadataChange(slideIndex, field, value)
    },
    [onMetadataChange]
  )

  const handleKeyDown = useCallback(
    (e, slideIndex, field) => {
      // Tab to next field, Shift+Tab to previous
      if (e.key === 'Tab') {
        e.preventDefault()
        const fields = ['slideId', 'name', 'type']
        const currentFieldIndex = fields.indexOf(field)
        
        if (e.shiftKey) {
          // Previous field
          if (currentFieldIndex > 0) {
            const prevField = fields[currentFieldIndex - 1]
            document.getElementById(`cell-${slideIndex}-${prevField}`)?.focus()
          } else if (slideIndex > 0) {
            // Go to last field of previous row
            const prevField = 'type'
            document.getElementById(`cell-${slideIndex - 1}-${prevField}`)?.focus()
          }
        } else {
          // Next field
          if (currentFieldIndex < fields.length - 1) {
            const nextField = fields[currentFieldIndex + 1]
            document.getElementById(`cell-${slideIndex}-${nextField}`)?.focus()
          } else if (slideIndex < metadata.length - 1) {
            // Go to first field of next row
            const nextField = 'slideId'
            document.getElementById(`cell-${slideIndex + 1}-${nextField}`)?.focus()
          }
        }
      }
      
      // Arrow keys for navigation
      if (e.key === 'ArrowUp' && slideIndex > 0) {
        e.preventDefault()
        document.getElementById(`cell-${slideIndex - 1}-${field}`)?.focus()
      }
      if (e.key === 'ArrowDown' && slideIndex < metadata.length - 1) {
        e.preventDefault()
        document.getElementById(`cell-${slideIndex + 1}-${field}`)?.focus()
      }
    },
    [metadata.length]
  )

  const getRowErrors = (slideIndex) => errors[slideIndex] || {}

  return (
    <div className="metadata-table-wrapper">
      <table className="metadata-table">
        <thead>
          <tr>
            <th className="metadata-table-col-slide">#</th>
            <th className="metadata-table-col-id">Slide ID</th>
            <th className="metadata-table-col-name">Slide Name</th>
            <th className="metadata-table-col-type">Type</th>
          </tr>
        </thead>
        <tbody>
          {metadata.map((slide, slideIndex) => {
            const isSelected = slideIndex === selectedSlideIndex
            const isHovered = slideIndex === hoveredSlideIndex
            const rowErrors = getRowErrors(slideIndex)

            return (
              <tr
                key={slideIndex}
                className={`metadata-table-row ${isSelected ? 'selected' : ''} ${
                  isHovered ? 'hovered' : ''
                } ${Object.keys(rowErrors).length > 0 ? 'has-errors' : ''}`}
                onClick={() => onRowClick(slideIndex)}
                onMouseEnter={() => onRowHover(slideIndex)}
                onMouseLeave={() => onRowHover(null)}
              >
                {/* Slide number */}
                <td className="metadata-table-col-slide">
                  <span className="metadata-table-slide-number">{slideIndex + 1}</span>
                </td>

                {/* Slide ID */}
                <td className="metadata-table-col-id">
                  <div className="metadata-table-cell">
                    <input
                      id={`cell-${slideIndex}-slideId`}
                      type="text"
                      value={slide.slideId}
                      onChange={(e) => handleCellChange(slideIndex, 'slideId', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, slideIndex, 'slideId')}
                      placeholder="e.g., intro-slide"
                      className={`metadata-table-input ${rowErrors.slideId ? 'error' : ''}`}
                      aria-label={`Slide ${slideIndex + 1} ID`}
                    />
                    {rowErrors.slideId && (
                      <div className="metadata-table-error" title={rowErrors.slideId}>
                        ⚠
                      </div>
                    )}
                  </div>
                </td>

                {/* Slide Name */}
                <td className="metadata-table-col-name">
                  <div className="metadata-table-cell">
                    <input
                      id={`cell-${slideIndex}-name`}
                      type="text"
                      value={slide.name}
                      onChange={(e) => handleCellChange(slideIndex, 'name', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, slideIndex, 'name')}
                      placeholder="e.g., Introduction"
                      className={`metadata-table-input ${rowErrors.name ? 'error' : ''}`}
                      aria-label={`Slide ${slideIndex + 1} Name`}
                    />
                    {rowErrors.name && (
                      <div className="metadata-table-error" title={rowErrors.name}>
                        ⚠
                      </div>
                    )}
                  </div>
                </td>

                {/* Slide Type */}
                <td className="metadata-table-col-type">
                  <div className="metadata-table-cell">
                    <select
                      id={`cell-${slideIndex}-type`}
                      value={slide.type}
                      onChange={(e) => handleCellChange(slideIndex, 'type', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, slideIndex, 'type')}
                      className={`metadata-table-select ${rowErrors.type ? 'error' : ''}`}
                      aria-label={`Slide ${slideIndex + 1} Type`}
                    >
                      <option value="">Select type</option>
                      {SLIDE_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    {rowErrors.type && (
                      <div className="metadata-table-error" title={rowErrors.type}>
                        ⚠
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
