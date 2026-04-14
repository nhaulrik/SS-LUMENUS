// Smart zone merge utility ? used by HtmlUploadStep and HtmlEditorPanel.
// Merges user edits (key renames, hint changes, type overrides, autoGenerate)
// from the old zone list into a freshly parsed new zone list.
// Matching is by the HTML data-zone value (zone.htmlKey or zone.key).
export function mergeZoneEdits(oldZones, newZones) {
  const editsByHtmlKey = {}
  oldZones.forEach(z => {
    const htmlKey = z.htmlKey ?? z.key
    editsByHtmlKey[htmlKey] = {
      key:          z.key,
      hint:         z.hint,
      type:         z.type,
      autoGenerate: z.autoGenerate,
    }
  })
  return newZones.map(z => {
    const edits = editsByHtmlKey[z.key]
    if (!edits) return { ...z, htmlKey: z.key }
    return {
      ...z,
      htmlKey:      z.key,
      key:          edits.key,
      hint:         edits.hint,
      type:         edits.type,
      autoGenerate: edits.autoGenerate,
    }
  })
}
