const AdmZip = require('adm-zip');
const zip = new AdmZip('./sample.pptx');
const entries = zip.getEntries().filter(e => e.entryName.match(/^ppt\/slides\/slide\d+\.xml$/)).sort((a,b) => {
  const ma = a.entryName.match(/slide(\d+)\.xml/);
  const mb = b.entryName.match(/slide(\d+)\.xml/);
  return parseInt(ma[1]) - parseInt(mb[1]);
});
entries.forEach(e => {
  const content = e.getData().toString('utf8');
  const textMatches = content.match(/<a:t>([^<]*)<\/a:t>/g) || [];
  const texts = textMatches.map(t => t.replace(/<[^>]+>/g, '')).filter(t => t.trim());
  console.log('Slide', e.entryName.match(/slide(\d+)/)[1], 'has', texts.length, 'text elements:', texts.slice(0,5).join(', '));
});