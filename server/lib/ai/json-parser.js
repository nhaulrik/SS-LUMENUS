/**
 * server/lib/ai/json-parser.js
 *
 * JSON parsing and AI response handling utilities.
 * Provides enhanced multi-strategy JSON extraction with repair logic
 * and AI-assisted JSON validation and repair.
 */

import { callAi } from './ai-client.js'

// Walk text from `start` and return the index after the matching closeChar.
// Respects string literals and escape sequences. Returns -1 if unbalanced.
function findBalancedEnd(text, start, openChar, closeChar) {
  let depth = 0, inString = false, escaped = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (escaped)                               { escaped = false; continue }
    if (c === '\\')                            { escaped = true;  continue }
    if (c === '"')                             { inString = !inString; continue }
    if (inString)                              continue
    if (c === openChar)                        depth++
    else if (c === closeChar && --depth === 0) return i + 1
  }
  return -1
}

/**
 * Enhanced JSON extraction with multiple strategies.
 * Returns { parsed, strategy } on success, throws with diagnostics on failure.
 */
function parseJson(text) {
  // Strategy 1: fenced code blocks (json, js, or bare)
  for (const pattern of [
    /```\s*(?:json|JSON)\s*([\s\S]*?)```/,
    /```\s*(?:javascript|js)\s*([\s\S]*?)```/,
    /```\s*([\s\S]*?)```/,
  ]) {
    const match = text.match(pattern)
    if (match) {
      try { return { parsed: JSON.parse(match[1].trim()), strategy: 'fenced-block' } } catch {}
    }
  }

  // Strategy 2: balanced JSON object
  const objectStart = text.indexOf('{')
  if (objectStart !== -1) {
    const endIdx = findBalancedEnd(text, objectStart, '{', '}')
    if (endIdx > objectStart) {
      try { return { parsed: JSON.parse(text.substring(objectStart, endIdx)), strategy: 'bracket-matched-object' } } catch {}
    }
  }

  // Strategy 3: balanced JSON array
  const arrayStart = text.indexOf('[')
  if (arrayStart !== -1) {
    const endIdx = findBalancedEnd(text, arrayStart, '[', ']')
    if (endIdx > arrayStart) {
      try { return { parsed: JSON.parse(text.substring(arrayStart, endIdx)), strategy: 'bracket-matched-array' } } catch {}
    }
  }

  // Strategy 4: full text
  try { return { parsed: JSON.parse(text.trim()), strategy: 'full-text' } } catch {}

  // Strategy 5: structural repair — close unclosed braces/brackets
  // Useful when the AI response was truncated mid-JSON
  try {
    const start = text.indexOf('{') !== -1 ? text.indexOf('{') : text.indexOf('[')
    if (start !== -1) {
      let fragment = text.substring(start)
      // Remove trailing incomplete string (last unmatched quote)
      const stack = []
      let inStr = false, esc = false, lastValidEnd = 0
      for (let i = 0; i < fragment.length; i++) {
        const c = fragment[i]
        if (esc) { esc = false; continue }
        if (c === '\\') { esc = true; continue }
        if (c === '"') { inStr = !inStr; continue }
        if (inStr) continue
        if (c === '{' || c === '[') stack.push(c)
        else if (c === '}' || c === ']') {
          stack.pop()
          if (stack.length === 0) { lastValidEnd = i + 1; break }
        }
      }
      // If stack is not empty, the JSON is unclosed — try to close it
      if (stack.length > 0) {
        // Strip any trailing incomplete property or comma
        let repaired = fragment.replace(/,\s*$/, '').replace(/,\s*\}/, '}').replace(/,\s*\]/, ']')
        // If we're mid-string, close the string first
        if (inStr) repaired += '"'
        // Close all open structures in reverse order
        for (let i = stack.length - 1; i >= 0; i--) {
          repaired += stack[i] === '{' ? '}' : ']'
        }
        try { return { parsed: JSON.parse(repaired), strategy: 'structural-repair' } } catch {}
      }
    }
  } catch {}

  throw new Error(
    `All JSON extraction strategies failed.\n` +
    `Text length: ${text.length} chars\n` +
    `Text preview (first 500 chars):\n${text.substring(0, 500)}`
  )
}

/**
 * Call the AI and parse the response as JSON.
 * Uses enhanced multi-strategy parsing with smart repair attempts.
 * 
 * Returns: { parsed, raw, strategy, wasRepaired, repairAttempts }
 */
async function callAiJson(prompt, options = {}, logFn = null) {
   const warn = (msg) => { console.warn(msg); logFn?.(`⚠️  ${msg}`) }
   const result = await callAi(prompt, options)
   let parseResult

    // Check for truncated response — skip parse attempt if truncated, go straight to repair
    if (result.finishReason === 'length') {
      warn(`Response truncated by max_tokens limit — skipping parse, going straight to repair`)
    } else if (result.finishReason !== 'stop') {
      warn(`Unexpected finish_reason: ${result.finishReason}`)
    }

    // Attempt 1: Try enhanced parsing on raw response (skip if truncated)
    if (result.finishReason !== 'length') {
      try {
        parseResult = parseJson(result.response)
        console.log(`[callAiJson] Parse succeeded on attempt 1 using strategy: ${parseResult.strategy}`)
        return {
          parsed: parseResult.parsed,
          raw: result.response,
          strategy: parseResult.strategy,
          wasRepaired: false,
          repairAttempts: 0,
          finishReason: result.finishReason,
        }
      } catch (firstErr) {
        console.warn('[callAiJson] Parse attempt 1 failed:', firstErr.message)
      }
    }

    // Repair attempt 1: Ask for strict JSON-only response
    logFn?.(`JSON parse failed — attempting repair 1 (strict JSON-only format)...`)
    console.log('[callAiJson] Attempting repair 1: strict JSON-only format')
    const repairPrompt1 =
      `You previously returned text that contains JSON but is not valid. ` +
      `Extract and return ONLY the raw JSON object or array — nothing else.\n` +
      `- Do not include markdown code fences\n` +
      `- Do not include explanatory text before or after\n` +
      `- Do not include comments\n` +
      `- Start with { or [ and end with } or ]\n` +
      `- Ensure all strings are properly quoted and escaped\n` +
      `- Within string values, escape all double quotes as \\", all backslashes as \\\\, and all newlines as \\n\n` +
      `- Ensure all braces and brackets are balanced\n\n` +
      `Original response to repair:\n${result.response}`

     const retry1 = await callAi(repairPrompt1, {
       maxTokens: options.maxTokens ?? 64000,
       temperature: 0,
     })

    if (retry1.finishReason === 'length') {
      warn(`Repair 1 response also truncated by max_tokens limit`)
    }

    try {
      parseResult = parseJson(retry1.response)
      console.log(`[callAiJson] Parse succeeded on repair 1 using strategy: ${parseResult.strategy}`)
      return {
        parsed: parseResult.parsed,
        raw: retry1.response,
        strategy: parseResult.strategy,
        wasRepaired: true,
        repairAttempts: 1,
        finishReason: retry1.finishReason,
      }
    } catch (secondErr) {
      console.warn('[callAiJson] Repair 1 failed:', secondErr.message)
    }

    // Repair attempt 2: Extract the JSON object/array and ask to fix it
    // Use retry1.response if it looks more complete than the original, otherwise fall back to original
    logFn?.(`Repair 1 failed — attempting repair 2 (JSON fragment extraction)...`)
    console.log('[callAiJson] Attempting repair 2: JSON fragment extraction and validation')
    const repair2Source = retry1.response.length > 0 ? retry1.response : result.response
    const extractPrompt =
      `Extract the JSON object or array from this text (even if incomplete or malformed).\n` +
      `Return ONLY the JSON, fixing any obvious issues:\n` +
      `- Add missing closing braces/brackets\n` +
      `- Escape all unescaped double quotes inside string values as \\"\n` +
      `- Escape all literal newlines inside string values as \\n\n` +
      `- Fix trailing commas\n` +
      `- Ensure valid JSON syntax\n\n` +
      `Text:\n${repair2Source}`

     const retry2 = await callAi(extractPrompt, {
       maxTokens: options.maxTokens ?? 64000,
       temperature: 0,
     })

   if (retry2.finishReason === 'length') {
     warn(`Repair 2 response also truncated by max_tokens limit`)
   }

   try {
     parseResult = parseJson(retry2.response)
     console.log(`[callAiJson] Parse succeeded on repair 2 using strategy: ${parseResult.strategy}`)
     return {
       parsed: parseResult.parsed,
       raw: retry2.response,
       strategy: parseResult.strategy,
       wasRepaired: true,
       repairAttempts: 2,
       finishReason: retry2.finishReason,
     }
   } catch (thirdErr) {
     console.warn('[callAiJson] Repair 2 failed:', thirdErr.message)
   }

   // All repair attempts failed — throw comprehensive error
   throw new Error(
     `JSON parsing failed after 2 repair attempts.\n\n` +
     `Original response (${result.response.length} chars, finish_reason: ${result.finishReason}):\n` +
     `${result.response.substring(0, 1000)}${result.response.length > 1000 ? '\n[...truncated]' : ''}\n\n` +
     `Repair 1 response (${retry1.response.length} chars, finish_reason: ${retry1.finishReason}):\n` +
     `${retry1.response.substring(0, 500)}${retry1.response.length > 500 ? '\n[...truncated]' : ''}\n\n` +
     `Repair 2 response (${retry2.response.length} chars, finish_reason: ${retry2.finishReason}):\n` +
     `${retry2.response.substring(0, 500)}${retry2.response.length > 500 ? '\n[...truncated]' : ''}`
   )
}

export { parseJson, callAiJson }
