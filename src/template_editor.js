const http = require('http');
const fs = require('fs');
const path = require('path');
const { loadJSONFile } = require('../utils/fileUtils');
const { buildPresentation, validateInputData, loadTemplates } = require('./presentationService');

const PORT = process.env.PORT || 3000;
const ROOT = process.cwd();
const THEME_FILE = path.join(ROOT, 'data', 'theme.json');
const TEMPLATE_FILE = path.join(ROOT, 'data', 'slide_templates.json');
const INPUT_FILE = path.join(ROOT, 'data', 'input.json');
const OUTPUT_DIR = path.join(ROOT, 'output');
const PUBLIC_DIR = path.join(ROOT, 'public');

function sendJSON(res, data, status = 200) {
  const payload = JSON.stringify(data, null, 2);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(payload);
}

function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function safePath(requestPath) {
  const normalized = path.normalize(requestPath);
  const resolved = path.resolve(normalized);
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

function readJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        resolve(parsed);
      } catch (error) {
        reject(new Error('Invalid JSON payload'));
      }
    });
  });
}

function sendFileFromOutput(res, fileName) {
  const safeName = path.basename(fileName);
  const filePath = path.join(OUTPUT_DIR, safeName);
  const safe = safePath(filePath);
  if (!safe) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  sendFile(res, safe, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname;

  if (pathname === '/favicon.ico') {
    res.writeHead(404);
    res.end();
    return;
  }

  if (pathname === '/api/theme') {
    if (req.method === 'GET') {
      return fs.readFile(THEME_FILE, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Failed to read theme.json' }));
          return;
        }
        try {
          sendJSON(res, JSON.parse(data));
        } catch (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Invalid JSON in theme.json' }));
        }
      });
    }
    if (req.method === 'POST') {
      try {
        const theme = await readJSONBody(req);
        fs.writeFile(THEME_FILE, JSON.stringify(theme, null, 2), 'utf8', err => {
          if (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Failed to save theme.json' }));
            return;
          }
          sendJSON(res, { ok: true });
        });
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  if (pathname === '/api/templates') {
    if (req.method === 'GET') {
      return fs.readFile(TEMPLATE_FILE, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Failed to read slide_templates.json' }));
          return;
        }
        try {
          sendJSON(res, JSON.parse(data));
        } catch (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Invalid JSON in slide_templates.json' }));
        }
      });
    }
    if (req.method === 'POST') {
      try {
        const template = await readJSONBody(req);
        fs.writeFile(TEMPLATE_FILE, JSON.stringify(template, null, 2), 'utf8', err => {
          if (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Failed to save slide_templates.json' }));
            return;
          }
          sendJSON(res, { ok: true });
        });
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  if (pathname === '/api/input') {
    if (req.method === 'GET') {
      return fs.readFile(INPUT_FILE, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Failed to read input.json' }));
          return;
        }
        try {
          sendJSON(res, JSON.parse(data));
        } catch (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Invalid JSON in input.json' }));
        }
      });
    }
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  if (pathname === '/api/validate' && req.method === 'POST') {
    try {
      const payload = await readJSONBody(req);
      const inputData = payload.inputData;
      if (!inputData) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Missing inputData in payload' }));
        return;
      }
      const templates = loadTemplates(TEMPLATE_FILE);
      const result = validateInputData(inputData, templates, payload.selectedTemplate);
      const status = result.errors.length ? 400 : 200;
      sendJSON(res, result, status);
    } catch (err) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (pathname === '/api/generate' && req.method === 'POST') {
    try {
      const payload = await readJSONBody(req);
      const inputData = payload.inputData;
      if (!inputData) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Missing inputData in payload' }));
        return;
      }
      const templates = loadTemplates(TEMPLATE_FILE);
      const validation = validateInputData(inputData, templates, payload.selectedTemplate);
      if (!validation.valid) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Input validation failed', details: validation.errors }));
        return;
      }
      const outputFile = await buildPresentation({
        inputData,
        templateFilePath: TEMPLATE_FILE,
        themeFilePath: THEME_FILE,
        outputDir: OUTPUT_DIR,
        outputPrefix: 'Solon_Roadmap_SteerCo_2026'
      });
      const fileName = path.basename(outputFile);
      sendJSON(res, { ok: true, fileName, downloadUrl: `/download/${encodeURIComponent(fileName)}` });
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (pathname.startsWith('/download/')) {
    const fileName = decodeURIComponent(path.basename(pathname.replace('/download/', '')));
    return sendFileFromOutput(res, fileName);
  }

  let filePath = path.join(PUBLIC_DIR, 'app.html');
  if (pathname === '/editor') {
    filePath = path.join(PUBLIC_DIR, 'editor.html');
  } else if (pathname === '/preview') {
    filePath = path.join(PUBLIC_DIR, 'app.html');
  } else if (pathname !== '/') {
    filePath = path.join(PUBLIC_DIR, pathname.replace(/^\//, ''));
  }

  const ext = path.extname(filePath).toLowerCase();
  const safe = safePath(filePath);
  if (!safe) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  };

  if (ext && contentTypes[ext]) {
    sendFile(res, safe, contentTypes[ext]);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Solon Slide Studio is running at http://localhost:${PORT}`);
  console.log('Open that URL in your browser to manage templates, validate JSON, preview slides and generate PPTX.');
});
