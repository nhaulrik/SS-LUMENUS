import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PROJECTS_DIR = process.env.PROJECTS_DIR || path.join(__dirname, 'projects');
export const RESOLVED_PROJECTS_DIR = path.resolve(PROJECTS_DIR);

export const SLICE_TEMPLATES_DIR = path.join(__dirname, 'templates', 'slice-output');

/** Returns true only when `filePath` is strictly inside `resolvedBase`. */
export function isInsideDir(filePath, resolvedBase) {
  const resolved = path.resolve(filePath);
  return resolved.startsWith(resolvedBase + path.sep) || resolved === resolvedBase;
}

// ── Context size limits ────────────────────────────────────────────────────────
export const MAX_CONTEXT_CHARS = 400_000;
export const MAX_TEXT_FILE_CHARS = 400_000;
export const MAX_ORCHESTRATOR_CONTEXT_CHARS = 400_000;

// ── Excel / CSV parsing ────────────────────────────────────────────────────────
export const EXCEL_MAX_CELL_LENGTH = 500;

// ── Export / filename limits ───────────────────────────────────────────────────
export const MAX_EXPORT_FILENAME_LENGTH = 50;

// ── HTML Flow & Template session limits ────────────────────────────────────────
export const PENDING_TEMPLATE_TTL_MS = 2 * 60 * 60 * 1000;   // 2 hours
export const MAX_JSON_UPLOAD_BYTES = 2 * 1024 * 1024;          // 2 MB

// ── Agentic processing batch sizes ────────────────────────────────────────────
export const SLICER_BATCH_SIZE = 3;
export const AGENT_BATCH_SIZE = 5;
export const RAW_CONTEXT_CAP_CHARS = 300_000;
