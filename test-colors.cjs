const admZip = require('adm-zip');
const z = new admZip('temp/1775765545584-generated-1775765464053.pptx');
const e = z.getEntries().find(e => e.entryName === 'ppt/slides/slide1.xml');
const c = e.getData().toString('utf8');
const m = c.match(/<a:srgbClr val="([^"]+)"/g);
console.log(m ? 'Found: ' + m.length : 'none');
if (m) console.log(m.slice(0, 5));