const path = require('path');
const fs = require('fs');
const { loadJSONFile } = require('../utils/fileUtils');
const { buildPresentation } = require('./presentationService');

const INPUT_JSON = path.resolve(__dirname, '..', 'data', 'input.json');
const TEMPLATE_JSON = path.resolve(__dirname, '..', 'data', 'slide_templates.json');
const THEME_JSON = path.resolve(__dirname, '..', 'data', 'theme.json');
const OUTPUT_DIR = path.resolve(__dirname, '..', 'output');

async function run() {
  if (!fs.existsSync(INPUT_JSON)) {
    console.error(`❌ ${INPUT_JSON} not found!`);
    process.exit(1);
  }
  if (!fs.existsSync(TEMPLATE_JSON)) {
    console.error(`❌ ${TEMPLATE_JSON} not found!`);
    process.exit(1);
  }

  let inputData;
  try {
    inputData = loadJSONFile(INPUT_JSON);
  } catch (err) {
    console.error(`❌ Failed to parse ${INPUT_JSON}:`, err.message);
    process.exit(1);
  }

  console.log(`✅ Loaded slide input from ${INPUT_JSON}`);
  try {
    const outputFile = await buildPresentation({
      inputData,
      templateFilePath: TEMPLATE_JSON,
      themeFilePath: THEME_JSON,
      outputDir: OUTPUT_DIR,
      outputPrefix: 'Solon_Roadmap_SteerCo_2026'
    });
    console.log('✅ Presentation successfully generated!');
    console.log(`📁 File saved as: ${outputFile}`);
  } catch (err) {
    console.error('❌ Failed to generate presentation:', err.message);
    process.exit(1);
  }
}

run();