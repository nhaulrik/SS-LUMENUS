import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { CHAINS_DIR } from './config.js';
import htmlFlowRoutes from './routes/html-flow.js';

// Ensure runtime directories exist
for (const dir of [CHAINS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api', htmlFlowRoutes);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Start listening only when run directly — not when imported by tests.
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
