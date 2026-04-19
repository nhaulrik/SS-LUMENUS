/**
 * server/lib/validation.js
 *
 * Shared input-validation patterns used across lib modules.
 */

/** Matches valid project names and flow IDs: alphanumeric, hyphens, underscores, 1–100 chars. */
export const NAME_RE = /^[\w-]{1,100}$/

/** Matches valid export IDs: "export-N" where N is a non-negative integer. */
export const EXPORT_ID_RE = /^export-\d+$/
