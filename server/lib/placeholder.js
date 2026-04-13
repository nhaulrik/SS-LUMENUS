// Strips date/project suffixes from fuzzy key matching (e.g. revenue_2024_solon -> revenue).
const stripKeySuffix = (k) => k
  .replace(/_20\d{2}.*$/, '')
  .replace(/_session.*$/, '')
  .replace(/_steerco.*$/, '')
  .replace(/_roadmap.*$/, '')
  .replace(/_product.*$/, '')
  .replace(/_tax.*$/, '')
  .replace(/_solon.*$/, '');

const escapeXml = (str) => {
  if (str === null || str === undefined) return '';
  // Coerce to string (AI may return numbers)
  const s = String(str);
  return s
    // Newlines are not valid inside <a:t> in OOXML — replace with a space.
    // Proper multi-line content would require <a:br/> between <a:r> runs,
    // which is a more complex transformation not supported here.
    .replace(/\r\n|\r|\n/g, ' ')
    // Collapse multiple spaces that result from newline replacement
    .replace(/  +/g, ' ')
    // XML special characters
    .replace(/&(?!(amp|lt|gt|apos|quot);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .trim();
};

export function replacePlaceholders(content, jsonData, recordData, tags, slideIndex) {
  const slideTags = tags.filter(t => t.slideIndex === slideIndex);

  const contextualEntry = !recordData && Array.isArray(jsonData.contextual)
    ? jsonData.contextual.find(c => c.slide_index === slideIndex)
    : null;

  const findValue = (key) => {
    if (contextualEntry && contextualEntry[key] !== undefined) return contextualEntry[key];
    const source = recordData || jsonData.static || jsonData;
    if (source[key] !== undefined) return source[key];
    const keyBase = stripKeySuffix(key);
    for (const k of Object.keys(source)) {
      if (k.includes(key) || key.includes(k) || stripKeySuffix(k) === keyBase) return source[k];
    }
    return undefined;
  };

  return content.replace(/<a:t>([^<]*)<\/a:t>/g, (match, text) => {
    const tag = slideTags.find(t => text.includes(`{{${t.key}}}`));
    if (tag) {
      return tag.autoGenerate
        ? `<a:t>${escapeXml(findValue(tag.key)) || ''}</a:t>`
        : `<a:t>${escapeXml(tag.originalText) || ''}</a:t>`;
    }
    return match;
  });
}
