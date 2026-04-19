import React, { useCallback } from 'react'
import css from './ContentReviewTable.module.css'

/**
 * Editable zone × slide content review table.
 * Props:
 *   contentTable: { blocks: {key: value}, slides: { slideKey: { instances: [{key: value}] } } }
 *   instanceNames: string[]  — display names for each instance column
 *   zones: array  — authoritative zone definitions (with slideIndex, autoGenerate, ignored, key)
 *   repeatableSlides: array  — repeatable slide definitions (with slideIndex, key)
 *   onChange: (updatedContentTable) => void
 */
export default function ContentReviewTable({ contentTable, instanceNames, zones = [], repeatableSlides = [], onChange }) {
  if (!contentTable) return null

  const blocks = contentTable.blocks || {}
  const slides = contentTable.slides || {}

  // Collect all slide keys and their instance counts
  const slideEntries = Object.entries(slides) // [[slideKey, { instances: [...] }]]
  
  // Flatten all instances across all slide keys into a single list
  const flatInstances = []
  slideEntries.forEach(([slideKey, slideData]) => {
    slideData.instances?.forEach((inst, idx) => {
      flatInstances.push({ slideKey, instanceIndex: idx, name: instanceNames[flatInstances.length] || `Slide ${flatInstances.length + 1}` })
    })
  })

  // Derive zone keys from the authoritative zones array (not from AI-returned keys)
  // Block zones: not in any repeatable slide
  // Repeatable zones: in a repeatable slide
  const repSlideIndexes = new Set(repeatableSlides.map(rs => rs.slideIndex))
  
  const activeZones = zones.filter(z => z.autoGenerate !== false && !z.ignored && z.key)
  const blockZones = activeZones.filter(z => !repSlideIndexes.has(z.slideIndex))
  const repeatableZones = activeZones.filter(z => repSlideIndexes.has(z.slideIndex))
  
  const blockZoneKeys = blockZones.map(z => z.key)
  const repeatableZoneKeys = repeatableZones.map(z => z.key).filter((k, i, arr) => arr.indexOf(k) === i) // unique

  const hasBlocks = blockZoneKeys.length > 0
  const hasSlides = flatInstances.length > 0 || repeatableZoneKeys.length > 0

  const handleBlockChange = useCallback((key, value) => {
    onChange({
      ...contentTable,
      blocks: { ...contentTable.blocks, [key]: value }
    })
  }, [contentTable, onChange])

  const handleInstanceChange = useCallback((slideKey, instanceIndex, zoneKey, value) => {
    const updatedSlides = { ...contentTable.slides }
    const updatedInstances = [...(updatedSlides[slideKey]?.instances || [])]
    updatedInstances[instanceIndex] = { ...updatedInstances[instanceIndex], [zoneKey]: value }
    updatedSlides[slideKey] = { ...updatedSlides[slideKey], instances: updatedInstances }
    onChange({ ...contentTable, slides: updatedSlides })
  }, [contentTable, onChange])

  return (
    <div className={css.wrapper}>
      {/* Info bar */}
      <div className={css.infoBar}>
        {blockZoneKeys.length > 0 && (
          <span className={css.infoStat}>📋 {blockZoneKeys.length} shared zone{blockZoneKeys.length !== 1 ? 's' : ''}</span>
        )}
        {repeatableZoneKeys.length > 0 && (
          <span className={css.infoStat}>🔁 {repeatableZoneKeys.length} repeatable zone{repeatableZoneKeys.length !== 1 ? 's' : ''}</span>
        )}
        {flatInstances.length > 0 && (
          <span className={css.infoStat}>✓ {flatInstances.length} slide instance{flatInstances.length !== 1 ? 's' : ''} mapped</span>
        )}
        {repeatableZoneKeys.length > 0 && flatInstances.length === 0 && instanceNames.length > 0 && (
          <span className={css.infoBarWarning}>⚠ Expected {instanceNames.length} slide instances but none were returned by the AI</span>
        )}
      </div>

      <table className={css.table}>
        <thead>
          <tr>
            <th className={css.zoneCol}>Zone</th>
            {hasBlocks && <th className={css.valueCol}>All Slides</th>}
            {flatInstances.map((inst, i) => (
              <th key={i} className={css.valueCol}>{inst.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Block zone rows — derived from zones array, values from dataTable.blocks */}
          {blockZoneKeys.map(key => (
            <tr key={`block-${key}`} className={css.blockRow}>
              <td className={css.zoneKey}>{key}</td>
              <td className={css.valueCell}>
                <textarea
                  className={css.cellInput}
                  value={blocks[key] ?? ''}
                  onChange={e => handleBlockChange(key, e.target.value)}
                  rows={2}
                />
              </td>
              {flatInstances.map((inst, i) => (
                <td key={i} className={css.emptyCell} />
              ))}
            </tr>
          ))}

          {/* Repeatable zone rows — derived from zones array, values from dataTable.slides instances */}
          {repeatableZoneKeys.map(zoneKey => (
            <tr key={`zone-${zoneKey}`} className={css.instanceRow}>
              <td className={css.zoneKey}>{zoneKey}</td>
              {hasBlocks && <td className={css.emptyCell} />}
              {flatInstances.map((inst, i) => {
                const val = slides[inst.slideKey]?.instances?.[inst.instanceIndex]?.[zoneKey] ?? ''
                return (
                  <td key={i} className={css.valueCell}>
                    <textarea
                      className={css.cellInput}
                      value={val}
                      onChange={e => handleInstanceChange(inst.slideKey, inst.instanceIndex, zoneKey, e.target.value)}
                      rows={2}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
