/**
 * server/routes/ai-proxy.js
 *
 * Express router for AI API proxy endpoint.
 * Provides a unified interface for calling AI providers.
 */

import express from 'express';
import { callAi } from '../lib/ai/ai-client.js';

const router = express.Router();

// ── POST /api/ai-proxy/generate ───────────────────────────────────────────────

router.post('/ai-proxy/generate', async (req, res) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  const { prompt, model, temperature, maxTokens } = req.body;

   // Validate required fields
   if (!prompt || typeof prompt !== 'string') {
     return res.status(400).json({
      ok: false,
      error: 'Prompt is required and must be a string',
    });
  }

  try {
    const result = await callAi(prompt, {
      model,
      temperature,
      maxTokens,
    });

     const elapsed = Date.now() - startTime;

     return res.status(200).json({
      ok: true,
      response: result.response,
      usage: result.usage,
      latencyMs: result.latencyMs,
      finishReason: result.finishReason,
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Response: 500 - ${error.message}`);

    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

export default router;
