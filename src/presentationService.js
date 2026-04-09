const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');
const ThemeManager = require('../utils/theme');
const { loadJSONFile, getField, ensureDirectory, formatTimestamp } = require('../utils/fileUtils');

function loadTemplates(templatePath) {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }
  const payload = loadJSONFile(templatePath);
  return payload.templates || {};
}

function loadPresentations(templatePath) {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }
  const payload = loadJSONFile(templatePath);
  return payload.presentations || {};
}

function resolveTemplateKey(type, templates) {
  if (!type || !templates) return type;
  if (templates[type]) return type;
  return Object.keys(templates).find(key => type === key || type.startsWith(`${key}_`) || key.startsWith(`${type}_`)) || type;
}

function validateInputData(inputData, templates, selectedTemplate) {
  const errors = [];
  const warnings = [];

  if (!inputData || typeof inputData !== 'object') {
    errors.push('Input data must be a JSON object.');
    return { valid: false, errors, warnings, slideTypes: [], matchingSlides: 0 };
  }

  const slides = inputData.slide_recipe?.slides || inputData.slides;
  if (!Array.isArray(slides)) {
    errors.push('Input JSON must include a slide_recipe.slides array.');
    return { valid: false, errors, warnings, slideTypes: [], matchingSlides: 0 };
  }

  const knownTypes = Object.keys(templates || {});
  const slideTypes = [];
  let matchingSlides = 0;

  slides.forEach((slide, index) => {
    const type = slide.slide_type;
    if (!type) {
      errors.push(`Slide ${index + 1} is missing a required slide_type field.`);
      return;
    }
    slideTypes.push(type);
    if (!knownTypes.includes(type)) {
      warnings.push(`Slide ${index + 1} uses unknown template type '${type}'.`);
      return;
    }
    if (selectedTemplate && type === selectedTemplate) {
      matchingSlides += 1;
    }

    const templateKey = resolveTemplateKey(type, templates);
    const template = templates[templateKey];
    if (!template) {
      warnings.push(`Slide ${index + 1}: template '${type}' is not defined.`);
      return;
    }
    (template.components || []).forEach(component => {
      if (!component.bind || component.type === 'shape' || component.type === 'header') return;
      if (typeof component.bind === 'string') {
        const value = getField(slide, component.bind);
        if (value === undefined || value === null || value === '') {
          warnings.push(`Slide ${index + 1}: component bind '${component.bind}' may be missing data for template type '${type}'.`);
        }
      }
      if (component.type === 'table') {
        const table = getField(slide, component.bind);
        if (!table || !Array.isArray(table.rows) || table.rows.length === 0) {
          warnings.push(`Slide ${index + 1}: table component bound to '${component.bind}' has no rows.`);
        }
      }
    });
  });

  if (selectedTemplate && matchingSlides === 0) {
    errors.push(`The selected template '${selectedTemplate}' has no matching slides in the provided input JSON.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    slideTypes,
    matchingSlides
  };
}

function expandSlidesFromStructure(presentation, data) {
  const expandedSlides = [];
  
  function getDataAtPath(dataObj, path) {
    if (!path) return dataObj;
    const parts = path.split('.');
    let current = dataObj;
    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return current;
  }

  function processStructureItem(structureItem) {
    const slideType = presentation.slideTypes[structureItem.type];
    if (!slideType) {
      console.warn(`Slide type '${structureItem.type}' not found in presentation`);
      return;
    }

    if (structureItem.dataPath === null) {
      expandedSlides.push({
        type: structureItem.type,
        data: { ...data },
        slideType: slideType
      });
      return;
    }

    if (!structureItem.dataPath) return;

    const items = getDataAtPath(data, structureItem.dataPath);
    if (!Array.isArray(items)) return;

    if (structureItem.children) {
      items.forEach(item => {
        const children = getDataAtPath(item, structureItem.children);
        if (Array.isArray(children) && children.length > 0) {
          children.forEach(child => {
            expandedSlides.push({
              type: structureItem.type,
              data: { ...data, ...item, ...child },
              slideType: slideType
            });
          });
        } else {
          expandedSlides.push({
            type: structureItem.type,
            data: { ...data, ...item },
            slideType: slideType
          });
        }
      });
    } else {
      items.forEach(item => {
        expandedSlides.push({
          type: structureItem.type,
          data: { ...data, ...item },
          slideType: slideType
        });
      });
    }
  }

  presentation.structure.forEach(item => processStructureItem(item));
  return expandedSlides;
}

function validatePresentationData(inputData, presentation) {
  const errors = [];
  const warnings = [];

  if (!inputData || typeof inputData !== 'object') {
    errors.push('Input data must be a JSON object.');
    return { valid: false, errors, warnings };
  }

  const requiredFields = ['title', 'subtitle', 'header_title'];
  const missingFields = requiredFields.filter(field => !inputData[field]);
  
  if (missingFields.length > 0 && !inputData.initiative_groups) {
    warnings.push(`Some common fields are missing: ${missingFields.join(', ')}. These may be optional.`);
  }

  if (inputData.initiative_groups) {
    if (!Array.isArray(inputData.initiative_groups)) {
      errors.push('initiative_groups must be an array.');
    } else {
      inputData.initiative_groups.forEach((group, index) => {
        if (!group.id) {
          warnings.push(`Group ${index + 1} is missing an 'id' field.`);
        }
        if (group.initiatives && !Array.isArray(group.initiatives)) {
          errors.push(`Group '${group.id || index + 1}' has invalid 'initiatives' - must be an array.`);
        }
        group.initiatives?.forEach((initiative, iIndex) => {
          if (!initiative.id) {
            warnings.push(`Initiative ${iIndex + 1} in group '${group.id || index + 1}' is missing an 'id' field.`);
          }
        });
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function addSlideHeader(slide, pres, title, subtitle, theme) {
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 1.05, fill: { color: theme.getColor('darkTeal') } });
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.08, h: 1.05, fill: { color: theme.getColor('coral') } });
  if (title) {
    slide.addText(title, {
      x: 0.2,
      y: 0.07,
      w: 7,
      h: 0.55,
      fontSize: 20,
      bold: true,
      color: theme.getColor('white'),
      fontFace: theme.getFontFace('heading')
    });
  }
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.2,
      y: 0.6,
      w: 9,
      h: 0.38,
      fontSize: 11,
      color: theme.getColor('lightTeal'),
      fontFace: theme.getFontFace()
    });
  }
  slide.addText('Netcompany', {
    x: 7.5,
    y: 0.08,
    w: 2.3,
    h: 0.4,
    fontSize: 12,
    bold: true,
    color: theme.getColor('lightTeal'),
    fontFace: theme.getFontFace(),
    align: 'right'
  });
}

function addFooter(slide, pres, pageNum, theme) {
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.45, w: 10, h: 0.175, fill: { color: theme.getColor('darkTeal') } });
  slide.addText('Solon Tax Product Roadmap 2026 | SteerCo', {
    x: 0.15,
    y: 5.44,
    w: 7,
    h: 0.18,
    fontSize: 8,
    color: theme.getColor('bgGrey'),
    fontFace: theme.getFontFace()
  });
  if (pageNum) {
    slide.addText(String(pageNum), {
      x: 9.5,
      y: 5.44,
      w: 0.4,
      h: 0.18,
      fontSize: 8,
      color: theme.getColor('bgGrey'),
      fontFace: theme.getFontFace(),
      align: 'right'
    });
  }
}

function addKpiCard(slide, pres, component, item, x, theme) {
  slide.addShape(pres.shapes.RECTANGLE, { x, y: component.y, w: component.cardWidth, h: component.cardHeight, fill: { color: theme.getColor('darkTeal') }, line: { color: theme.getColor('medTeal') }, shadow: theme.getShadow() });
  slide.addShape(pres.shapes.RECTANGLE, { x, y: component.y, w: 0.06, h: component.cardHeight, fill: { color: theme.getColor('coral') } });
  slide.addText(String(item.value), {
    x: x + 0.1,
    y: component.y + 0.1,
    w: component.cardWidth - 0.2,
    h: component.cardHeight * 0.48,
    fontSize: 22,
    bold: true,
    color: theme.getColor('white'),
    fontFace: theme.getFontFace(),
    align: 'center'
  });
  if (item.unit) {
    slide.addText(item.unit, {
      x: x + 0.1,
      y: component.y + component.cardHeight * 0.52,
      w: component.cardWidth - 0.2,
      h: 0.22,
      fontSize: 9,
      color: theme.getColor('gold'),
      fontFace: theme.getFontFace(),
      align: 'center'
    });
  }
  slide.addText(item.label, {
    x: x + 0.05,
    y: component.y + component.cardHeight * 0.68,
    w: component.cardWidth - 0.1,
    h: 0.36,
    fontSize: 9,
    color: theme.getColor('bgGrey'),
    fontFace: theme.getFontFace(),
    align: 'center',
    wrap: true
  });
}

function renderShape(slide, pres, component, theme) {
  const shapeType = pres.shapes[component.shape?.toUpperCase()] || pres.shapes.RECTANGLE;
  const opts = {
    x: component.x,
    y: component.y,
    w: component.w,
    h: component.h,
    fill: { color: theme.getColor(component.fill) || component.fill || theme.getColor('white') }
  };
  if (component.line) {
    opts.line = { color: theme.getColor(component.line.color) || component.line.color, width: component.line.width || 0.5 };
  }
  slide.addShape(shapeType, opts);
}

function renderText(slide, component, data, theme) {
  const value = component.staticText ?? getField(data, component.bind);
  if (value === undefined || value === null) return;
  slide.addText(String(value), {
    x: component.x,
    y: component.y,
    w: component.w,
    h: component.h,
    fontSize: component.fontSize || 10,
    bold: component.bold || false,
    italic: component.italic || false,
    color: theme.getColor(component.color) || component.color || theme.getColor('nearBlack'),
    fontFace: theme.getFontFace(component.font || 'body'),
    align: component.align,
    wrap: component.wrap !== false,
    valign: component.valign,
    margin: component.margin
  });
}

function renderBulletList(slide, component, data, theme) {
  const list = getField(data, component.bind);
  if (!Array.isArray(list) || !list.length) return;
  slide.addText(list.map(item => ({ text: item, options: { bullet: true } })), {
    x: component.x,
    y: component.y,
    w: component.w,
    h: component.h,
    fontSize: component.fontSize || 9,
    color: theme.getColor(component.color) || component.color || theme.getColor('textGrey'),
    fontFace: theme.getFontFace(component.font || 'body'),
    wrap: true
  });
}

function renderKpiRow(slide, pres, component, data, theme) {
  const items = getField(data, component.bind);
  if (!Array.isArray(items)) return;
  const cardW = component.cardWidth || 2.2;
  const gap = component.gap !== undefined ? component.gap : 0.19;
  items.forEach((item, index) => {
    const x = component.x + index * (cardW + gap);
    addKpiCard(slide, pres, component, item, x, theme);
  });
}

function renderTable(slide, component, data, theme) {
  const table = getField(data, component.bind);
  if (!table || !Array.isArray(table.rows)) return;
  const columns = component.columns || [];
  const header = columns.map(col => ({
    text: col.label,
    options: {
      bold: true,
      color: theme.getColor('white'),
      fill: { color: theme.getColor('darkTeal') },
      align: col.align || 'left',
      fontSize: component.fontSize || 9
    }
  }));
  const body = table.rows.map(row => columns.map(col => ({
    text: String(getField(row, col.key) ?? ''),
    options: {
      align: col.align || 'left',
      fontSize: component.fontSize || 9
    }
  })));
  slide.addTable([header, ...body], {
    x: component.x,
    y: component.y,
    w: component.w,
    h: component.h,
    colW: component.colW,
    border: { pt: component.borderPt || 0.5, color: theme.getColor('bgGrey') }
  });
}

function renderBarChart(slide, pres, component, data, theme) {
  const chart = getField(data, component.bind);
  if (!chart || !Array.isArray(chart.features)) return;
  slide.addText(component.title || chart.title || '', {
    x: component.x,
    y: component.y,
    w: component.w,
    h: 0.25,
    fontSize: component.titleFontSize || 10,
    bold: true,
    color: theme.getColor('coral'),
    fontFace: theme.getFontFace(component.font || 'heading')
  });
  slide.addChart(pres.charts.BAR, [{
    name: component.seriesName || 'Hours',
    labels: chart.features.map(f => f.name),
    values: chart.features.map(f => f.hours)
  }], {
    x: component.x,
    y: component.y + 0.27,
    w: component.w,
    h: component.h,
    barDir: component.barDir || 'bar',
    chartColors: [theme.getColor(component.color) || theme.getColor('medTeal')],
    showValue: component.showValue !== false,
    dataLabelFontSize: component.dataLabelFontSize || 7
  });
}

function renderDonutChart(slide, pres, component, data, theme) {
  const chart = getField(data, component.bind);
  if (!chart || !Array.isArray(chart.segments)) return;
  slide.addText(component.title || chart.title || '', {
    x: component.x,
    y: component.y,
    w: component.w,
    h: 0.25,
    fontSize: component.titleFontSize || 10,
    bold: true,
    color: theme.getColor('coral'),
    fontFace: theme.getFontFace(component.font || 'heading')
  });
  slide.addChart(pres.charts.DOUGHNUT, [{
    name: component.seriesName || 'Series',
    labels: chart.segments.map(seg => seg.label),
    values: chart.segments.map(seg => seg.value)
  }], {
    x: component.x,
    y: component.y + 0.27,
    w: component.w,
    h: component.h,
    holeSize: component.holeSize || 55,
    showLegend: component.showLegend !== false,
    legendPos: component.legendPos || 'b',
    showPercent: component.showPercent !== false,
    chartColors: chart.segments.map(seg => theme.getColor(seg.color) || seg.color || theme.getColor('coral'))
  });
}

function renderPiPlanning(slide, pres, component, data, theme) {
  const planning = getField(data, component.bind);
  if (!planning || !Array.isArray(planning.bands)) return;
  slide.addText(component.title || planning.title || 'PI Planning', {
    x: component.x,
    y: component.y,
    w: component.w,
    h: 0.22,
    fontSize: component.titleFontSize || 10,
    bold: true,
    color: theme.getColor('coral'),
    fontFace: theme.getFontFace(component.font || 'heading')
  });
  planning.bands.forEach((band, index) => {
    const bx = component.x + index * (component.bandWidth || 3.17);
    slide.addShape(pres.shapes.RECTANGLE, {
      x: bx,
      y: component.y + 0.25,
      w: component.bandWidth || 3.0,
      h: component.bandHeight || 0.72,
      fill: { color: theme.getColor(band.color) || band.color || theme.getColor('medTeal') }
    });
    slide.addText(band.pi, {
      x: bx + 0.1,
      y: component.y + 0.28,
      w: 0.55,
      h: 0.22,
      fontSize: 10,
      bold: true,
      color: theme.getColor('gold'),
      fontFace: theme.getFontFace(component.font || 'heading')
    });
    slide.addText(band.note, {
      x: bx + 0.68,
      y: component.y + 0.27,
      w: (component.bandWidth || 3.0) - 0.68,
      h: 0.44,
      fontSize: component.noteFontSize || 8,
      color: theme.getColor('white'),
      wrap: true,
      fontFace: theme.getFontFace(component.font || 'body')
    });
  });
}

function renderFooterBanner(slide, pres, component, data, theme) {
  const text = getField(data, component.bind);
  if (!text) return;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: component.x,
    y: component.y,
    w: component.w,
    h: component.h,
    fill: { color: theme.getColor(component.fill) || component.fill || theme.getColor('darkTeal') }
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: component.x,
    y: component.y,
    w: component.accentWidth || 0.06,
    h: component.h,
    fill: { color: theme.getColor(component.accentColor) || component.accentColor || theme.getColor('gold') }
  });
  slide.addText(String(text), {
    x: component.x + (component.textInset || 0.15),
    y: component.y,
    w: component.w - (component.textInset || 0.15) - 0.1,
    h: component.h,
    fontSize: component.fontSize || 7.5,
    color: theme.getColor(component.color) || component.color || theme.getColor('bgGrey'),
    wrap: true,
    valign: 'middle',
    fontFace: theme.getFontFace(component.font || 'body')
  });
}

function renderAgendaGrid(slide, pres, component, data, theme) {
  const items = getField(data, component.bind);
  if (!Array.isArray(items)) return;
  items.forEach((item, index) => {
    const col = index % component.columns;
    const row = Math.floor(index / component.columns);
    const x = component.x + col * (component.cardWidth + component.horizontalGap);
    const y = component.y + row * component.rowHeight;
    slide.addShape(pres.shapes.RECTANGLE, {
      x,
      y,
      w: component.cardWidth,
      h: component.cardHeight,
      fill: { color: theme.getColor('white') },
      line: { color: theme.getColor('bgGrey') },
      shadow: theme.getShadow()
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x,
      y,
      w: 0.06,
      h: component.cardHeight,
      fill: { color: theme.getColor('coral') }
    });
    slide.addText(item.num, {
      x: x + 0.12,
      y: y + 0.08,
      w: 0.5,
      h: 0.4,
      fontSize: component.numberFontSize || 20,
      bold: true,
      color: theme.getColor('lightTeal')
    });
    slide.addText(item.title, {
      x: x + 0.12,
      y: y + 0.42,
      w: component.cardWidth - 0.24,
      h: 0.38,
      fontSize: component.titleFontSize || 11,
      bold: true,
      color: theme.getColor('darkTeal')
    });
    slide.addText(item.sub, {
      x: x + 0.12,
      y: y + 0.78,
      w: component.cardWidth - 0.24,
      h: 0.35,
      fontSize: component.bodyFontSize || 8.5,
      color: theme.getColor('slate'),
      wrap: true
    });
  });
}

function renderDecisionList(slide, pres, component, data, theme) {
  const decisions = getField(data, component.bind);
  if (!Array.isArray(decisions)) return;
  decisions.forEach((decision, index) => {
    const y = component.y + index * component.rowHeight;
    slide.addShape(pres.shapes.RECTANGLE, {
      x: component.x,
      y,
      w: component.cardWidth,
      h: component.cardHeight,
      fill: { color: theme.getColor('medTeal') }
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x: component.x,
      y,
      w: component.accentWidth || 0.06,
      h: component.cardHeight,
      fill: { color: theme.getColor('gold') }
    });
    slide.addText(decision.num, {
      x: component.x + 0.1,
      y: y + 0.08,
      w: 0.4,
      h: 0.5,
      fontSize: component.numFontSize || 18,
      bold: true,
      color: theme.getColor('gold')
    });
    slide.addText(decision.action, {
      x: component.x + 0.55,
      y: y + 0.1,
      w: component.cardWidth - 0.6,
      h: 0.28,
      fontSize: component.actionFontSize || 11,
      bold: true,
      color: theme.getColor('white')
    });
    slide.addText(decision.detail, {
      x: component.x + 0.55,
      y: y + 0.4,
      w: component.cardWidth - 0.6,
      h: 0.28,
      fontSize: component.detailFontSize || 9,
      color: theme.getColor('bgGrey'),
      wrap: true
    });
  });
}

function renderComponent(slide, pres, component, data, theme) {
  switch (component.type) {
    case 'shape':
      return renderShape(slide, pres, component, theme);
    case 'header':
      return renderHeader(slide, pres, component, data, theme);
    case 'text':
      return renderText(slide, component, data, theme);
    case 'bullet_list':
      return renderBulletList(slide, component, data, theme);
    case 'kpi_row':
      return renderKpiRow(slide, pres, component, data, theme);
    case 'table':
      return renderTable(slide, component, data, theme);
    case 'bar_chart':
      return renderBarChart(slide, pres, component, data, theme);
    case 'donut_chart':
      return renderDonutChart(slide, pres, component, data, theme);
    case 'pi_planning':
      return renderPiPlanning(slide, pres, component, data, theme);
    case 'footer_banner':
      return renderFooterBanner(slide, pres, component, data, theme);
    case 'agenda_grid':
      return renderAgendaGrid(slide, pres, component, data, theme);
    case 'decision_list':
      return renderDecisionList(slide, pres, component, data, theme);
    default:
      console.warn(`Unknown component type: ${component.type}`);
      return;
  }
}

function renderHeader(slide, pres, component, data, theme) {
  const title = getField(data, component.bind?.title) || component.title;
  const subtitle = getField(data, component.bind?.subtitle) || component.subtitle;
  addSlideHeader(slide, pres, title, subtitle, theme);
}

async function buildPresentation({ inputData, templateFilePath, themeFilePath, outputDir, outputPrefix = 'Solon_Generated', presentationKey = null }) {
  const presentations = loadPresentations(templateFilePath);
  const theme = new ThemeManager();
  theme.loadFromFile(themeFilePath);
  if (inputData.slide_recipe?.design_tokens) {
    theme.applyTheme(inputData.slide_recipe.design_tokens);
  } else if (inputData.design_tokens) {
    theme.applyTheme(inputData.design_tokens);
  }

  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.title = inputData.slide_recipe?.metadata?.presentation_title || inputData.title || 'Solon Presentation';
  pres.author = inputData.slide_recipe?.metadata?.author || inputData.author || 'Solon';

  if (presentationKey && presentations[presentationKey]) {
    const presentation = presentations[presentationKey];
    const expandedSlides = expandSlidesFromStructure(presentation, inputData);
    
    let pageNum = 1;
    expandedSlides.forEach(({ type, data, slideType }) => {
      const slide = pres.addSlide();
      if (slideType.background) {
        slide.background = { color: theme.getColor(slideType.background) || slideType.background };
      }
      (slideType.components || []).forEach(component => renderComponent(slide, pres, component, data, theme));
      if (slideType.footer) {
        addFooter(slide, pres, ++pageNum, theme);
      }
    });
  } else {
    const templates = loadTemplates(templateFilePath);
    const slides = inputData.slide_recipe?.slides || inputData.slides;
    if (!Array.isArray(slides)) {
      throw new Error('No slides array found in input data.');
    }

    let pageNum = 1;
    slides.forEach(sData => {
      const template = templates[resolveTemplateKey(sData.slide_type, templates)];
      if (!template) return;
      const slide = pres.addSlide();
      if (template.background) {
        slide.background = { color: theme.getColor(template.background) || template.background };
      }
      (template.components || []).forEach(component => renderComponent(slide, pres, component, sData, theme));
      if (template.footer) {
        addFooter(slide, pres, ++pageNum, theme);
      }
    });
  }

  ensureDirectory(outputDir);
  const outputFilePath = path.join(outputDir, `${formatTimestamp()}_${outputPrefix}.pptx`);
  await pres.writeFile({ fileName: outputFilePath });
  return outputFilePath;
}

module.exports = {
  buildPresentation,
  validateInputData,
  validatePresentationData,
  loadTemplates,
  loadPresentations,
  expandSlidesFromStructure
};
