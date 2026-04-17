import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { PROJECTS_DIR } from './config.js';
import htmlFlowRoutes from './routes/html-flow.js';
import projectsRoutes from './routes/projects.js';
import publishRoutes  from './routes/publish.js';
import aiProxyRoutes from './routes/ai-proxy.js';

dotenv.config({ path: './server/.env' });

// Ensure runtime directory exists
if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });

export const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/projects', projectsRoutes);
app.use('/api/projects', publishRoutes);
app.use('/api', htmlFlowRoutes);
app.use('/api', aiProxyRoutes);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Serve Published/ web apps statically.
// URL pattern: /published/<projectName>/<pubId>/<file>
// Only files inside <projectName>/Published/ are reachable.
app.use('/published/:projectName', (req, res, next) => {
  const { projectName } = req.params;
  if (!/^[\w-]{1,100}$/.test(projectName)) return res.status(400).end();
  const publishedDir = path.join(PROJECTS_DIR, projectName, 'Published');
  express.static(publishedDir, { index: 'index.html' })(req, res, next);
});

// Start listening only when run directly — not when imported by tests.
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
