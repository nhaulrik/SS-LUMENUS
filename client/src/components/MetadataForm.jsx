/**
 * MetadataForm — Form component for editing a single slide's metadata.
 *
 * Fields:
 * - slideId: unique identifier for the slide
 * - name: display name for the slide
 * - type: slide type (content, title, conclusion, other)
 */

import { useCallback } from 'react'

const SLIDE_TYPES = [
  { value: 'content', label: 'Content' },
  { value: 'title', label: 'Title' },
  { value: 'conclusion', label: 'Conclusion' },
  { value: 'other', label: 'Other' },
]

export default function MetadataForm({
  slide,
  slideNumber,
  onChange,
  errors = {},
}) {
  const handleChange = useCallback((field, value) => {
    onChange(field, value)
  }, [onChange])

  return (
    <div className="metadata-form">
      <div className="form-group">
        <label htmlFor={`slideId-${slideNumber}`}>Slide ID</label>
        <input
          id={`slideId-${slideNumber}`}
          type="text"
          value={slide.slideId}
          onChange={(e) => handleChange('slideId', e.target.value)}
          placeholder="e.g., intro-slide-1"
          className={errors.slideId ? 'input-error' : ''}
        />
        {errors.slideId && (
          <div className="form-error" role="alert">
            {errors.slideId}
          </div>
        )}
        <small>Unique identifier for this slide (alphanumeric, hyphens, underscores)</small>
      </div>

      <div className="form-group">
        <label htmlFor={`name-${slideNumber}`}>Slide Name</label>
        <input
          id={`name-${slideNumber}`}
          type="text"
          value={slide.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="e.g., Introduction"
          className={errors.name ? 'input-error' : ''}
        />
        {errors.name && (
          <div className="form-error" role="alert">
            {errors.name}
          </div>
        )}
        <small>Display name for this slide</small>
      </div>

      <div className="form-group">
        <label htmlFor={`type-${slideNumber}`}>Slide Type</label>
        <select
          id={`type-${slideNumber}`}
          value={slide.type}
          onChange={(e) => handleChange('type', e.target.value)}
          className={errors.type ? 'input-error' : ''}
        >
          <option value="">— Select a type —</option>
          {SLIDE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {errors.type && (
          <div className="form-error" role="alert">
            {errors.type}
          </div>
        )}
        <small>Categorize this slide for better organization</small>
      </div>
    </div>
  )
}
