import admZip from 'adm-zip';
import fs from 'fs';
import { slideNumFrom, slideNumComparator, extractSlideElements } from './slide-parser.js';
import { replacePlaceholders } from './placeholder.js';

const escapeXml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str).replace(/\r\n|\r|\n/g, ' ').replace(/&(?!(amp|lt|gt|apos|quot);)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

function injectChartData(zip, chartKey, chartData) {
  const chartEntries = zip.getEntries().filter(e => e.entryName.match(/^ppt\/charts\/chart\d+\.xml$/));
  if (chartEntries.length === 0) return;
  const chartEntry = chartEntries[0];
  let chartXml = chartEntry.getData().toString('utf8');
  if (chartData.title) {
    const titleMatch = chartXml.match(/<c:title>[\s\S]*?<c:tx>[\s\S]*?<c:rich>[\s\S]*?<a:t>([^<]*)<\/a:t>/);
    if (titleMatch) {
      chartXml = chartXml.replace(titleMatch[0], titleMatch[0].replace(titleMatch[1], escapeXml(chartData.title)));
    }
  }
  if (chartData.categories && chartData.values) {
    const strCacheMatch = chartXml.match(/<c:strCache>[\s\S]*?<\/c:strCache>/);
    if (strCacheMatch) {
      const ptCount = chartData.categories.length;
      const pts = chartData.categories.map((cat, i) => `<c:pt idx="${i}"><c:v>${escapeXml(cat)}</c:v></c:pt>`).join('');
      chartXml = chartXml.replace(strCacheMatch[0], `<c:strCache><c:ptCount val="${ptCount}"/>${pts}</c:strCache>`);
    }
    const numCacheMatch = chartXml.match(/<c:numCache>[\s\S]*?<\/c:numCache>/);
    if (numCacheMatch) {
      const ptCount = chartData.values.length;
      const pts = chartData.values.map((val, i) => `<c:pt idx="${i}"><c:v>${val}</c:v></c:pt>`).join('');
      chartXml = chartXml.replace(numCacheMatch[0], `<c:numCache><c:ptCount val="${ptCount}"/>${pts}</c:numCache>`);
    }
  }
  chartEntry.setData(Buffer.from(chartXml, 'utf8'));
}

// ── Chart tree deep-copy ──────────────────────────────────────────────────────
// Copies a chart XML file to a new unique path and creates a corresponding rels
// file that still points to the shared style/color/workbook targets (read-only
// resources that are safe to share between charts).
// Returns the new chart path (e.g. 'ppt/charts/chart3.xml').
function deepCopyChartTree(zip, sourcePath, nextChartNum, snapshot) {
  const sourceData = snapshot.charts[sourcePath];
  if (!sourceData) return null;

  const newFile = `chart${nextChartNum}.xml`;
  const newPath = `ppt/charts/${newFile}`;
  const newRelsPath = `ppt/charts/_rels/${newFile}.rels`;

  // Copy the chart XML verbatim — data values are already baked in
  zip.addFile(newPath, sourceData);

  // Copy the chart's own rels file if present.
  // The targets inside (style, colors, Excel workbook) are read-only shared
  // resources — they do not need to be duplicated.
  const srcRelsPath = `ppt/charts/_rels/${sourcePath.replace('ppt/charts/', '')}.rels`;
  const srcRelsData = snapshot.chartRels[srcRelsPath];
  if (srcRelsData) {
    zip.addFile(newRelsPath, srcRelsData);
  }

  return newPath;
}

// ── Pre-flight validation ─────────────────────────────────────────────────────
// After all slides are written, verify that no two slides share the same chart.
// Throws a descriptive error if the ownership invariant is violated.
function validateChartOwnership(zip) {
  const chartOwners = {}; // chartPath → slideNum
  const violations  = [];

  zip.getEntries()
    .filter(e => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(e.entryName))
    .forEach(e => {
      const slideNum = e.entryName.match(/slide(\d+)/)[1];
      const relsXml  = e.getData().toString('utf8');
      const pattern  = /Target="([^"]*\/charts\/[^"]+)"/g;
      let m;
      while ((m = pattern.exec(relsXml)) !== null) {
        const target = m[1];
        const resolved = 'ppt/charts/' + target.replace('../charts/', '');
        if (chartOwners[resolved] !== undefined) {
          violations.push(`chart "${resolved}" shared by slides ${chartOwners[resolved]} and ${slideNum}`);
        } else {
          chartOwners[resolved] = slideNum;
        }
      }
    });

  if (violations.length > 0) {
    throw new Error(`[pptx-builder] Chart ownership violation(s):\n  ${violations.join('\n  ')}`);
  }
}

// ── Shape ID renumbering ──────────────────────────────────────────────────────
// Each shape in a PPTX must have a unique id attribute across the presentation.
// Cloned slides duplicate the template's shape IDs. This function rewrites all
// id="N" attributes in a slide XML to use a fresh range starting at baseId.
// Returns the modified XML and the next available ID.
function renumberShapeIds(slideXml, baseId) {
  let nextId = baseId;
  // Replace id="N" on p:cNvPr elements (the canonical shape ID location)
  const result = slideXml.replace(/(<p:cNvPr[^>]*\s)id="(\d+)"/g, (match, prefix) => {
    return `${prefix}id="${nextId++}"`;
  });
  return { xml: result, nextId };
}

export function buildPptxZip(templatePath, tags, jsonData, repeatableSlides) {
  const buffer = fs.readFileSync(templatePath);
  const zip = new admZip(buffer);

  // Inject chart data if any chart tags exist in the JSON
  const chartTags = tags.filter(t => {
    const staticData = jsonData.static || jsonData;
    return t.autoGenerate && staticData[t.key] && typeof staticData[t.key] === 'object';
  });
  chartTags.forEach(tag => {
    const staticData = jsonData.static || jsonData;
    const chartData  = staticData[tag.key];
    if (chartData && typeof chartData === 'object') injectChartData(zip, tag.key, chartData);
  });

  const sortedEntries = zip.getEntries()
    .filter(e => e.entryName.match(/^ppt\/slides\/slide\d+\.xml$/))
    .sort(slideNumComparator);

  // Inject placeholders into each slide
  const baseContent = {};
  for (const entry of sortedEntries) {
    let content = entry.getData().toString('utf8');
    const slideNum = parseInt(entry.entryName.match(/slide(\d+)\.xml/)[1]);
    tags.filter(t => t.slideIndex === slideNum).forEach(tag => {
      if (tag.originalText) {
        const escaped = tag.originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        content = content.replace(new RegExp(`<a:t>(${escaped})</a:t>`, 'g'), `<a:t>{{${tag.key}}}</a:t>`);
      }
    });
    baseContent[slideNum] = content;
  }

  // Build repeatable instances
  const slidesData = jsonData.slides || {};
  const structureTypeToTemplate = {};
  (repeatableSlides || []).forEach(r => {
    const st = r.structureType || `slide_${r.slideIndex}`;
    structureTypeToTemplate[st] = { slideIndex: r.slideIndex, content: baseContent[r.slideIndex] };
  });

  const generatedSlides = [];
  Object.entries(slidesData).forEach(([, instances]) => {
    if (!Array.isArray(instances) || instances.length === 0) return;
    instances.forEach((instance, instanceIdx) => {
      const template = structureTypeToTemplate[instance.structure_type];
      if (template) {
        generatedSlides.push({
          slideIndex:    template.slideIndex,
          instanceIndex: instanceIdx + 1,
          structureType: instance.structure_type,
          instanceData:  instance,
          content:       replacePlaceholders(template.content, jsonData, instance, tags, template.slideIndex)
        });
      }
    });
  });

  // Build static slides
  const repeatableSet = new Set((repeatableSlides || []).map(r => r.slideIndex));
  for (let slideNum = 1; slideNum <= sortedEntries.length; slideNum++) {
    if (!repeatableSet.has(slideNum)) {
      generatedSlides.push({
        slideIndex:    slideNum,
        instanceIndex: null,
        content:       replacePlaceholders(baseContent[slideNum], jsonData.static || jsonData, null, tags, slideNum)
      });
    }
  }

  // Interleave repeatable slides by parent-child relationship
  const staticSlides   = generatedSlides.filter(g => g.instanceIndex === null);
  const repeatableList = generatedSlides.filter(g => g.instanceIndex !== null);

  const tierOrder = [...new Set(
    (repeatableSlides || []).slice().sort((a, b) => a.slideIndex - b.slideIndex)
      .map(r => r.structureType || `slide_${r.slideIndex}`)
  )];

  const stringValues     = (instance) =>
    new Set(Object.values(instance).filter(v => typeof v === 'string' && v.trim() !== ''));
  const tierBuckets      = tierOrder.map(st => repeatableList.filter(s => s.structureType === st));
  const sortedRepeatable = [];
  const placed           = new Set();

  if (tierBuckets.length <= 1) {
    sortedRepeatable.push(...(tierBuckets[0] || []));
  } else {
    tierBuckets[0].forEach(parent => {
      sortedRepeatable.push(parent);
      placed.add(parent);
      const parentValues = stringValues(parent.instanceData);
      tierBuckets.slice(1).forEach(childBucket => {
        childBucket.forEach(child => {
          if (placed.has(child)) return;
          const linked = [...stringValues(child.instanceData)].some(v => parentValues.has(v));
          if (linked) { sortedRepeatable.push(child); placed.add(child); }
        });
      });
    });
    tierBuckets.slice(1).forEach(childBucket => {
      childBucket.forEach(child => { if (!placed.has(child)) sortedRepeatable.push(child); });
    });
  }

  const sortedGenerated = [...staticSlides, ...sortedRepeatable];

  // ── Snapshot chart files BEFORE modifying the zip ────────────────────────────
  // deepCopyChartTree reads from this snapshot so it always has the original data
  // regardless of what we've already added to the zip.
  const snapshot = { charts: {}, chartRels: {} };
  zip.getEntries().forEach(e => {
    if (/^ppt\/charts\/chart\d+\.xml$/.test(e.entryName))
      snapshot.charts[e.entryName] = e.getData();
    if (/^ppt\/charts\/_rels\/chart\d+\.xml\.rels$/.test(e.entryName))
      snapshot.chartRels[e.entryName] = e.getData();
  });

  // Determine the next available chart number
  const existingChartNums = Object.keys(snapshot.charts)
    .map(p => parseInt(p.match(/chart(\d+)\.xml/)[1]));
  let nextChartNum = existingChartNums.length > 0 ? Math.max(...existingChartNums) + 1 : 1;

  // claimedCharts: tracks which chart paths are already owned by an output slide.
  // - Cloned slides (instanceIndex !== null) ALWAYS get their own copy — they are
  //   structural duplicates that must be independent.
  // - Static slides get a copy only if the chart is already claimed (defensive
  //   against templates that were themselves produced by a broken prior build).
  const claimedCharts  = new Set();
  const newChartFiles  = []; // for [Content_Types].xml registration

  // ── Collect _rels templates before deleting originals ────────────────────────
  const slideRelsTemplates = {};
  zip.getEntries()
    .filter(e => e.entryName.match(/^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/))
    .forEach(e => { slideRelsTemplates[slideNumFrom(e)] = e.getData().toString('utf8'); });

  // Delete original slides and their rels
  zip.getEntries().forEach(entry => {
    if (entry.entryName.match(/^ppt\/slides\/slide\d+\.xml$/) ||
        entry.entryName.match(/^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/)) {
      zip.deleteEntry(entry.entryName);
    }
  });

  // ── Determine the starting shape ID for renumbering ──────────────────────────
  // Find the highest existing shape ID across all template slides so clones
  // start from a safe range and never collide with static slides.
  let nextShapeId = 1000;
  Object.values(baseContent).forEach(xml => {
    const ids = [...(xml.matchAll(/id="(\d+)"/g))].map(m => parseInt(m[1]));
    if (ids.length > 0) nextShapeId = Math.max(nextShapeId, ...ids) + 1;
  });

  // ── Add generated slides ─────────────────────────────────────────────────────
  const fallbackRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`;

  sortedGenerated.forEach((gs, idx) => {
    const slideNum    = idx + 1;
    const isClone     = gs.instanceIndex !== null;

    // Escape stray ampersands left by placeholder substitution
    let slideXml = (gs.content || '').replace(/&(?!(amp|lt|gt|apos|quot);)/g, '&amp;');

    // Renumber shape IDs on cloned slides to avoid collisions with static slides
    if (isClone) {
      const renumbered = renumberShapeIds(slideXml, nextShapeId);
      slideXml  = renumbered.xml;
      nextShapeId = renumbered.nextId;
    }

    zip.addFile(`ppt/slides/slide${slideNum}.xml`, Buffer.from(slideXml, 'utf8'));

    // Build the slide rels — strip notesSlide refs (per-slide, must not be copied)
    const sourceRels = slideRelsTemplates[gs.slideIndex] || slideRelsTemplates[1] || fallbackRels;
    let finalRels = sourceRels.replace(/<Relationship[^>]*notesSlide[^>]*\/>/g, '');

    // Process chart relationships — ensure every output slide owns its chart exclusively
    const chartRelPattern = /<Relationship\s+Id="([^"]+)"\s+Type="[^"]*\/chart"\s+Target="([^"]+)"[^>]*\/>/g;
    const chartReplacements = {};
    let m;

    while ((m = chartRelPattern.exec(finalRels)) !== null) {
      const rId        = m[1];
      const target     = m[2];                                   // e.g. ../charts/chart1.xml
      const sourcePath = 'ppt/charts/' + target.replace('../charts/', '');

      const mustCopy = isClone || claimedCharts.has(sourcePath);

      if (mustCopy) {
        const newPath = deepCopyChartTree(zip, sourcePath, nextChartNum, snapshot);
        if (!newPath) continue; // source not found — leave rel unchanged

        const newFile = newPath.replace('ppt/charts/', '');
        nextChartNum++;
        newChartFiles.push(newFile);
        claimedCharts.add(newPath);
        chartReplacements[rId] = `../charts/${newFile}`;
      } else {
        // Static slide, first claim — this slide owns the original chart
        claimedCharts.add(sourcePath);
      }
    }

    // Rewrite chart targets in the rels XML
    for (const [rId, newTarget] of Object.entries(chartReplacements)) {
      const safe = rId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      finalRels = finalRels.replace(
        new RegExp(`(<Relationship[^>]*Id="${safe}"[^>]*Target=")[^"]+(")`),
        `$1${newTarget}$2`
      );
    }

    zip.addFile(`ppt/slides/_rels/slide${slideNum}.xml.rels`, Buffer.from(finalRels, 'utf8'));
  });

  // ── Pre-flight: verify chart ownership invariant ──────────────────────────────
  validateChartOwnership(zip);

  // ── Update presentation.xml.rels ─────────────────────────────────────────────
  const relsEntry = zip.getEntries().find(e => e.entryName === 'ppt/_rels/presentation.xml.rels');
  if (relsEntry) {
    let relsXml = relsEntry.getData().toString('utf8');
    relsXml = relsXml.replace(/<Relationship[^>]*\/officeDocument\/2006\/relationships\/slide"[^>]*\/>/g, '');
    const existingIds = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map(m => parseInt(m[1]));
    const maxRId      = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const newSlideRels = sortedGenerated.map((_, idx) =>
      `<Relationship Id="rId${maxRId + idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${idx + 1}.xml"/>`
    ).join('');
    relsXml = relsXml.replace('</Relationships>', newSlideRels + '</Relationships>');
    relsEntry.setData(Buffer.from(relsXml, 'utf8'));

    const presEntry = zip.getEntries().find(e => e.entryName === 'ppt/presentation.xml');
    if (presEntry) {
      let presXml = presEntry.getData().toString('utf8');
      const slideIds = sortedGenerated.map((_, idx) =>
        `<p:sldId id="${256 + idx}" r:id="rId${maxRId + idx + 1}"/>`
      ).join('');
      presXml = presXml.replace(
        /<p:sldIdLst[^>]*>[\s\S]*?<\/p:sldIdLst>/,
        `<p:sldIdLst>${slideIds}</p:sldIdLst>`
      );
      presEntry.setData(Buffer.from(presXml, 'utf8'));
    }
  }

  // ── Update [Content_Types].xml ────────────────────────────────────────────────
  const ctEntry = zip.getEntries().find(e => e.entryName === '[Content_Types].xml');
  if (ctEntry) {
    let ctXml = ctEntry.getData().toString('utf8');
    ctXml = ctXml.replace(/<Override PartName="\/ppt\/slides\/slide\d+\.xml"[^>]*\/>/g, '');
    const slideOverrides = sortedGenerated.map((_, i) =>
      `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
    );
    const lastOverrideMatch = ctXml.match(/<Override PartName="(?!\/ppt\/slides\/)[^"]*"[^>]*\/>/g);
    if (lastOverrideMatch) {
      const last = lastOverrideMatch[lastOverrideMatch.length - 1];
      const at   = ctXml.lastIndexOf(last);
      ctXml = ctXml.slice(0, at + last.length) + '\n' + slideOverrides.join('\n') + ctXml.slice(at + last.length);
    } else {
      ctXml = ctXml.replace('</Types>', slideOverrides.join('\n') + '\n</Types>');
    }
    // Register new chart copies in Content_Types
    if (newChartFiles.length > 0) {
      const chartCT = 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml';
      const chartOverrides = newChartFiles
        .map(f => `<Override PartName="/ppt/charts/${f}" ContentType="${chartCT}"/>`)
        .join('\n');
      ctXml = ctXml.replace('</Types>', chartOverrides + '\n</Types>');
    }
    ctEntry.setData(Buffer.from(ctXml, 'utf8'));
  }

  // ── Build preview data ────────────────────────────────────────────────────────
  const previewData = sortedGenerated.map((gs, idx) => {
    let elements = { elements: [], background: '#ffffff' };
    try { elements = extractSlideElements(gs.content || '', gs.slideIndex); } catch (e) {
      console.error(`[pptx-builder] Failed to parse slide ${gs.slideIndex} for preview:`, e.message);
    }
    chartTags.forEach(tag => {
      const staticData = jsonData.static || jsonData;
      const chartData  = staticData[tag.key];
      const chartEl    = elements.elements.find(el => el.type === 'chart');
      if (chartEl && chartData) {
        chartEl.chartData = {
          title:      chartData.title      || chartEl.chartData?.title,
          categories: chartData.categories || chartEl.chartData?.categories,
          values:     chartData.values     || chartEl.chartData?.values
        };
      }
    });
    const textMatches = (gs.content || '').match(/<a:t>([^<]*)<\/a:t>/g) || [];
    return {
      slideNumber:        idx + 1,
      templateSlideIndex: gs.slideIndex,
      instanceIndex:      gs.instanceIndex,
      content:            gs.content,
      elements:           elements.elements,
      background:         elements.background,
      sampleText:         textMatches.slice(0, 3).map(t => t.replace(/<[^>]+>/g, '')),
      width:              elements.width  || 10,
      height:             elements.height || 5.625
    };
  });

  return { zip, previewData };
}
