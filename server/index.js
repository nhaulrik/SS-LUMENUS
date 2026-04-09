import express from 'express';
import cors from 'cors';
import admZip from 'adm-zip';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const TEMP_DIR = path.join(__dirname, 'temp');
const OUTPUT_DIR = path.join(__dirname, 'output');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// UC-01: Upload and parse PPTX
app.post('/api/upload-pptx', (req, res) => {
  try {
    const { file, fileName } = req.body;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const buffer = Buffer.from(file, 'base64');
    const tempPath = path.join(TEMP_DIR, `${Date.now()}-${fileName || 'template.pptx'}`);
    fs.writeFileSync(tempPath, buffer);

    const zip = new admZip(buffer);
    const slides = parseSlides(zip);

    res.json({
      ok: true,
      filePath: tempPath,
      slides,
      fileName: fileName || 'template.pptx'
    });
  } catch (err) {
    res.status(400).json({ error: 'Failed to parse PPTX: ' + err.message });
  }
});

function parseSlides(zip) {
  const slides = [];
  const slideEntries = zip.getEntries().filter(e => e.entryName.match(/^ppt\/slides\/slide\d+\.xml$/));
  
  for (const entry of slideEntries.sort((a, b) => {
    const numA = parseInt(a.entryName.match(/slide(\d+)\.xml/)[1]);
    const numB = parseInt(b.entryName.match(/slide(\d+)\.xml/)[1]);
    return numA - numB;
  })) {
    const content = entry.getData().toString('utf8');
    const slideData = extractSlideElements(content, parseInt(entry.entryName.match(/slide(\d+)\.xml/)[1]));
    slides.push(slideData);
  }
  
  return slides;
}

function extractSlideElements(xml, slideIndex) {
  const slide = {
    index: slideIndex,
    elements: [],
    background: '#ffffff'
  };

  // Get background color
  const bgMatch = xml.match(/<p:bg>([\s\S]*?)<\/p:bg>/);
  if (bgMatch) {
    const srgbMatch = bgMatch[1].match(/<a:srgbClr val="([^"]+)"/);
    if (srgbMatch) {
      slide.background = '#' + srgbMatch[1];
    } else {
      const prstMatch = bgMatch[1].match(/<a:prstClr val="(\w+)"/);
      if (prstMatch) slide.background = getPresetColor(prstMatch[1]);
    }
  }

  // Match all shapes - also include spTree children
  const spTreeMatch = xml.match(/<p:spTree>([\s\S]*?)<\/p:spTree>/);
  const shapesToCheck = spTreeMatch ? spTreeMatch[1] : xml;
  const shapeMatches = shapesToCheck.match(/<p:sp>([\s\S]*?)<\/p:sp>/g) || [];
  
  for (let i = 0; i < shapeMatches.length; i++) {
    const shapeXml = shapeMatches[i];
    const textMatches = shapeXml.match(/<a:t>([^<]*)<\/a:t>/g);
    
    if (!textMatches || textMatches.length === 0) continue;
    
    const textContent = textMatches.map(t => t.replace(/<[^>]+>/g, '')).join(' ');
    if (!textContent.trim()) continue;
    
    // Get shape position - look in multiple places
    let bounds = { x: 0.5, y: 0.5, w: 2, h: 0.5 };
    
    // Try p:xfrm first
    let xfrmContent = '';
    const xfrmMatch = shapeXml.match(/<p:xfrm>([\s\S]*?)<\/p:xfrm>/);
    if (xfrmMatch) xfrmContent = xfrmMatch[1];
    
    // Try a:xfrm inside spPr
    if (!xfrmContent) {
      const spPrMatch = shapeXml.match(/<p:spPr>([\s\S]*?)<\/p:spPr>/);
      if (spPrMatch) {
        const axfrmMatch = spPrMatch[1].match(/<a:xfrm>([\s\S]*?)<\/a:xfrm>/);
        if (axfrmMatch) xfrmContent = axfrmMatch[1];
      }
    }
    
    if (xfrmContent) {
      const offMatch = xfrmContent.match(/<a:off\s+x="(\d+)"\s+y="(\d+)"/);
      const extMatch = xfrmContent.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
      
      if (offMatch && extMatch) {
        bounds = {
          x: parseInt(offMatch[1]) / 914400,
          y: parseInt(offMatch[2]) / 914400,
          w: Math.max(0.1, parseInt(extMatch[1]) / 914400),
          h: Math.max(0.1, parseInt(extMatch[2]) / 914400)
        };
      }
    }

    // Get shape name
    let shapeName = `text_${i}`;
    const cNvPrMatch = shapeXml.match(/<p:cNvPr\s+id="\d+"\s+name="([^"]+)"/);
    if (cNvPrMatch) shapeName = cNvPrMatch[1];

    // Get fill color
    let fill = null;
    const spPrMatch = shapeXml.match(/<p:spPr>([\s\S]*?)<\/p:spPr>/);
    if (spPrMatch) {
      const srgbMatch = spPrMatch[1].match(/<a:srgbClr\s+val="([^"]+)"/);
      if (srgbMatch) fill = '#' + srgbMatch[1];
    }

    // Get text formatting
    let fontSize = 14;
    let fontBold = false;
    let fontColor = '#333333';
    let textAlign = 'left';

    const txPrMatch = shapeXml.match(/<p:txBody>([\s\S]*?)<\/p:txBody>/);
    if (txPrMatch) {
      const rPrMatch = txPrMatch[1].match(/<a:rPr([^>]*)>/);
      if (rPrMatch) {
        const sizeMatch = rPrMatch[1].match(/sz="(\d+)"/);
        if (sizeMatch) fontSize = parseInt(sizeMatch[1]) / 100;
        
        if (rPrMatch[1].includes('b="1"') || rPrMatch[1].includes('b="true"')) fontBold = true;
        
        const colorMatch = rPrMatch[1].match(/<a:srgbClr\s+val="([^"]+)"/);
        if (colorMatch) fontColor = '#' + colorMatch[1];
      }

      const alignMatch = txPrMatch[1].match(/<a:pPr[^>]*algn="(\w+)"/);
      if (alignMatch) textAlign = alignMatch[1];
    }

    slide.elements.push({
      id: `slide${slideIndex}-elem${i}`,
      shapeName,
      text: textContent,
      bounds,
      fill,
      fontSize,
      fontBold,
      fontColor,
      textAlign
    });
  }

  return slide;
}

function getPresetColor(name) {
  const colors = {
    white: '#FFFFFF',
    black: '#000000',
    red: '#FF0000',
    green: '#00FF00',
    blue: '#0000FF',
    yellow: '#FFFF00',
    cyan: '#00FFFF',
    magenta: '#FF00FF',
    gray: '#808080',
    darkGray: '#404040',
    lightGray: '#C0C0C0'
  };
  return colors[name] || '#FFFFFF';
}

// Generate recipe prompt (UC-04)
app.post('/api/generate-recipe', (req, res) => {
  try {
    const { tags, recordSlideIndex } = req.body;
    
    let recipe = `Return a JSON object with the following structure. Do not include any explanation — return only the JSON.\n\n{\n`;
    
    const rootFields = tags.filter(t => t.slideIndex !== recordSlideIndex);
    const recordFields = tags.filter(t => t.slideIndex === recordSlideIndex);
    
    // Root level fields
    rootFields.forEach((tag, idx) => {
      const comma = idx < rootFields.length - 1 || recordFields.length > 0 ? ',' : '';
      const hint = tag.hint ? ` // ${tag.hint}` : '';
      recipe += `  "${tag.key}": "..."${hint}${comma}\n`;
    });
    
    // Record slide as array
    if (recordSlideIndex !== null && recordFields.length > 0) {
      recipe += `  "records": [\n    {\n`;
      recordFields.forEach((tag, idx) => {
        const comma = idx < recordFields.length - 1 ? ',' : '';
        const hint = tag.hint ? ` // ${tag.hint}` : '';
        recipe += `      "${tag.key}": "..."${hint}${comma}\n`;
      });
      recipe += `    }\n    // repeat for each item\n  ]\n`;
    }
    
    recipe += `}`;
    
    res.json({ ok: true, recipe });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Validate JSON (UC-05)
app.post('/api/validate-json', (req, res) => {
  try {
    const { jsonString, tags, recordSlideIndex } = req.body;
    
    let data;
    try {
      data = JSON.parse(jsonString);
    } catch (e) {
      return res.json({ 
        valid: false, 
        error: 'Invalid JSON syntax',
        foundFields: [],
        missingFields: tags.map(t => t.key)
      });
    }
    
    const foundFields = [];
    const missingFields = [];
    
    // Check root fields
    const rootTags = tags.filter(t => t.slideIndex !== recordSlideIndex);
    rootTags.forEach(tag => {
      if (data[tag.key] !== undefined) {
        foundFields.push(tag.key);
      } else {
        missingFields.push(tag.key);
      }
    });
    
    // Check record fields
    const recordTags = tags.filter(t => t.slideIndex === recordSlideIndex);
    if (recordSlideIndex !== null && Array.isArray(data.records)) {
      data.records.forEach((record, idx) => {
        recordTags.forEach(tag => {
          if (record[tag.key] !== undefined) {
            if (!foundFields.includes(`${tag.key} (record ${idx + 1})`)) {
              foundFields.push(`${tag.key} (record ${idx + 1})`);
            }
          } else {
            if (!missingFields.includes(`${tag.key} (record ${idx + 1})`)) {
              missingFields.push(`${tag.key} (record ${idx + 1})`);
            }
          }
        });
      });
    }
    
    res.json({
      valid: true,
      error: null,
      foundFields,
      missingFields,
      recordCount: data.records ? data.records.length : 0
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Preview and Generate (UC-06, UC-07)
app.post('/api/generate-pptx', (req, res) => {
  try {
    const { templatePath, tags, jsonData, recordSlideIndex } = req.body;
    
    if (!templatePath || !fs.existsSync(templatePath)) {
      return res.status(400).json({ error: 'Template not found' });
    }
    
    const zip = new admZip(templatePath);
    const slideEntries = zip.getEntries().filter(e => e.entryName.match(/^ppt\/slides\/slide\d+\.xml$/));
    
    const sortedEntries = slideEntries.sort((a, b) => {
      const numA = parseInt(a.entryName.match(/slide(\d+)\.xml/)[1]);
      const numB = parseInt(b.entryName.match(/slide(\d+)\.xml/)[1]);
      return numA - numB;
    });
    
    // Map tags by element ID for quick lookup
    const tagMap = {};
    tags.forEach(tag => {
      tagMap[tag.elementId] = tag.key;
    });
    
    // Replace placeholders in each slide
    const generatedSlides = [];
    const recordTag = tags.find(t => t.slideIndex === recordSlideIndex);
    
    for (let slideIdx = 0; slideIdx < sortedEntries.length; slideIdx++) {
      const entry = sortedEntries[slideIdx];
      let content = entry.getData().toString('utf8');
      
      // Check if this is the record slide
      const isRecordSlide = slideIdx + 1 === recordSlideIndex;
      
      if (isRecordSlide && jsonData.records && jsonData.records.length > 0) {
        // Generate multiple copies of this slide
        jsonData.records.forEach((record, recordIdx) => {
          const slideContent = replacePlaceholders(content, jsonData, record, tags, slideIdx + 1);
          generatedSlides.push({ slideIndex: slideIdx + 1, recordIndex: recordIdx + 1, content: slideContent });
        });
      } else if (!isRecordSlide) {
        // Regular slide - just replace with root level data
        const slideContent = replacePlaceholders(content, jsonData, null, tags, slideIdx + 1);
        generatedSlides.push({ slideIndex: slideIdx + 1, recordIndex: null, content: slideContent });
      }
    }
    
    // If no record slide, just use all original slides with replacement
    if (recordSlideIndex === null) {
      for (const entry of sortedEntries) {
        let content = entry.getData().toString('utf8');
        const slideIdx = parseInt(entry.entryName.match(/slide(\d+)\.xml/)[1]);
        content = replacePlaceholders(content, jsonData, null, tags, slideIdx);
        generatedSlides.push({ slideIndex: slideIdx, recordIndex: null, content });
      }
    }
    
    // Write the modified slides back (replacing in order)
    // This is a simplified version - in production you'd rebuild properly
    const outputSlides = sortedEntries.map((entry, idx) => {
      const gen = generatedSlides.find(g => g.slideIndex === idx + 1 && g.recordIndex === null);
      if (gen) {
        return { entry, content: gen.content };
      }
      return { entry, content: entry.getData().toString('utf8') };
    });
    
    // For preview, return the modified slide data with element positions
    const previewData = generatedSlides.map(gs => {
      const elements = extractSlideElements(gs.content, gs.slideIndex);
      return {
        slideNumber: gs.slideIndex,
        recordIndex: gs.recordIndex,
        content: gs.content,
        elements: elements.elements
      };
    });
    
    // For download, create the file
    outputSlides.forEach(({ entry, content }) => {
      entry.setData(Buffer.from(content, 'utf8'));
    });
    
    const timestamp = Date.now();
    const outputPath = path.join(OUTPUT_DIR, `generated-${timestamp}.pptx`);
    zip.writeZip(outputPath);
    
    res.json({
      ok: true,
      previewData,
      downloadUrl: `/api/download/${path.basename(outputPath)}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate: ' + err.message });
  }
});

function replacePlaceholders(content, jsonData, recordData, tags, slideIndex) {
  const slideTags = tags.filter(t => t.slideIndex === slideIndex);
  
  return content.replace(/<a:t>([^<]*)<\/a:t>/g, (match, text) => {
    // Check if this text was tagged
    const tag = slideTags.find(t => text.includes(`{{${t.key}}}`));
    
    if (tag) {
      // Replace with actual data
      let value;
      if (recordData && tag.slideIndex === recordSlideIndex) {
        value = recordData[tag.key] || '';
      } else {
        value = jsonData[tag.key] || '';
      }
      return `<a:t>${value}</a:t>`;
    }
    
    return match;
  });
}

// Download generated file
app.get('/api/download/:filename', (req, res) => {
  const filePath = path.join(OUTPUT_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  res.download(filePath);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});