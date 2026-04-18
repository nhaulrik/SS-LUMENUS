/**
 * editorTheme.js — CodeMirror 6 theme with app-aware styling
 *
 * Syntax highlighting colors are intentionally distinct from UI colors:
 * - SYNTAX_TAG (#7dbfff): blue for typeName, tagName
 * - SYNTAX_KEYWORD (#d4a0ff): purple for numbers, keywords
 * - SYNTAX_ATTR (#FF9C6B): orange for attributeName
 */

import { EditorView } from '@codemirror/view'

// ── Syntax highlighting color constants ─────────────────────────────────────
export const SYNTAX_TAG = '#7dbfff'           // blue for typeName, tagName
export const SYNTAX_KEYWORD = '#d4a0ff'       // purple for numbers, keywords
export const SYNTAX_ATTR = '#FF9C6B'          // orange for attributeName

// ── App-theme CodeMirror extension ──────────────────────────────────────────
// Mirrors the app's CSS variables: --bg-secondary, --bg-elevated, --accent-primary, etc.
// Hard-coded hex values because CodeMirror themes run outside React's CSS context.

export const appTheme = EditorView.theme({
  '&': {
    backgroundColor:  '#1a1f1e',
    color:            '#d4d8d6',
    height:           '100%',
    fontSize:         '13px',
    fontFamily:       "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  },
  '.cm-content': { caretColor: '#4CAF80', padding: '8px 0' },
  '.cm-cursor':  { borderLeftColor: '#4CAF80' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'rgba(76,175,128,0.2)',
  },
  '.cm-activeLine':       { backgroundColor: 'rgba(76,175,128,0.06)' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(76,175,128,0.08)' },
  '.cm-gutters': {
    backgroundColor: '#151a19',
    color:           '#4a5450',
    border:          'none',
    borderRight:     '1px solid #1e2724',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 4px', minWidth: '32px' },
  '.cm-foldGutter .cm-gutterElement':  { padding: '0 4px' },
  '.cm-matchingBracket': { backgroundColor: 'rgba(76,175,128,0.25)', outline: 'none' },
  '.cm-tooltip': {
    backgroundColor: '#1e2724',
    border:          '1px solid #2a3330',
    color:           '#d4d8d6',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: 'rgba(76,175,128,0.2)',
    color:           '#d4d8d6',
  },
  // Syntax colours
  '.tok-comment':   { color: '#4a6050', fontStyle: 'italic' },
  '.tok-string':    { color: '#a8cc88' },
  '.tok-keyword':   { color: '#4CAF80' },
  '.tok-typeName':  { color: SYNTAX_TAG },
  '.tok-attributeName': { color: SYNTAX_ATTR },
  '.tok-attributeValue':{ color: '#a8cc88' },
  '.tok-number':    { color: SYNTAX_KEYWORD },
  '.tok-operator':  { color: '#4CAF80' },
  '.tok-punctuation':{ color: '#6a8070' },
  '.tok-tagName':   { color: SYNTAX_TAG },
  '.tok-angleBracket': { color: '#4a6050' },
  // data-zone highlight decoration
  '.cm-zone-highlight': {
    backgroundColor: 'rgba(76,175,128,0.18)',
    borderRadius:    '2px',
    outline:         '1px solid rgba(76,175,128,0.5)',
  },
}, { dark: true })
