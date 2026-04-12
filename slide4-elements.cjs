const AdmZip = require('adm-zip');
const zip = new AdmZip('./sample.pptx');
const entries = zip.getEntries().filter(e => e.entryName.match(/^ppt\/slides\/slide4\.xml$/));
const content = entries[0].getData().toString('utf8');
const textMatches = content.match(/<a:t>([^<]*)<\/a:t>/g) || [];
const texts = textMatches.map(t => t.replace(/<[^>]+>/g, '')).filter(t => t.trim());
console.log('Slide 4 text elements:', texts);