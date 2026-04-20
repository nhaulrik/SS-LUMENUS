/**
 * server/lib/validation.js
 *
 * Shared input-validation patterns used across lib modules.
 */

/** Matches valid project names and flow IDs: alphanumeric, hyphens, underscores, 1–100 chars. */
export const NAME_RE = /^[\w-]{1,100}$/

/** Matches valid export IDs: alphanumeric, hyphens, underscores, 1–100 chars. Allows both "export-N" and custom names like "blablaa-export-7". */
export const EXPORT_ID_RE = /^[\w-]{1,100}$/
