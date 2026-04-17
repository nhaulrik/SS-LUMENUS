/**
 * server/routes/opencode-poc.js
 *
 * OpenCode SDK integration PoC.
 * Demonstrates parallel AI task execution using OpenCode subagents.
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { createOpencode } from '@opencode-ai/sdk';
import { RESOLVED_PROJECTS_DIR } from '../config.js';

const router = express.Router();

// ── POST /poc ─────────────────────────────────────────────────────────────────

router.post('/poc', async (req, res) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  const { projectName } = req.query;

  console.log(`[${timestamp}] Request: POST /api/opencode/poc?projectName=${projectName}`);

  // Validate required fields
  if (!projectName || typeof projectName !== 'string') {
    console.log(`[${new Date().toISOString()}] Response: 400 - Missing or invalid projectName`);
    return res.status(400).json({
      ok: false,
      error: 'projectName query parameter is required',
    });
  }

  try {
    // Read context from AI Context folder
    const contextPath = path.join(RESOLVED_PROJECTS_DIR, projectName, 'AI Context');
    let contextText = '';

    try {
      const files = await fs.readdir(contextPath);
      const contextFiles = files.filter(f => f.endsWith('.txt') || f.endsWith('.md'));

      if (contextFiles.length > 0) {
        const contents = await Promise.all(
          contextFiles.map(f => fs.readFile(path.join(contextPath, f), 'utf-8'))
        );
        contextText = contents.join('\n\n');
      }
    } catch (err) {
      // AI Context folder doesn't exist or is empty — that's fine
      console.log(`[${timestamp}] Note: AI Context folder not found or empty for project ${projectName}`);
    }

    if (!contextText) {
      contextText = 'No context provided';
    }

    // Create OpenCode instance (per-request)
    console.log(`[${timestamp}] Initializing OpenCode SDK...`);
    const opencode = await createOpencode({ timeout: 10000 });

    // Create a session
    const sessionResponse = await opencode.client.session.create({
      body: { title: `PoC: ${projectName}` },
    });

    // Extract session ID from response
    const sessionId = sessionResponse?.data?.id || sessionResponse?.id;
    console.log(`[${timestamp}] Session created:`, sessionId);
    console.log(`[${timestamp}] Full session response:`, JSON.stringify(sessionResponse, null, 2).substring(0, 300));

    // Define the 3 parallel tasks
    const tasks = [
      {
        name: 'Slide Title',
        prompt: `Generate a concise slide title (5-10 words) based on this context:\n\n${contextText}`,
      },
      {
        name: 'Key Message',
        prompt: `Summarize the key message in exactly 2 sentences based on this context:\n\n${contextText}`,
      },
      {
        name: 'Call to Action',
        prompt: `Write a compelling call-to-action (1-2 sentences) for the final slide based on this context:\n\n${contextText}`,
      },
    ];

    // Poll session.message until the assistant message is complete, then extract text.
    const POLL_INTERVAL_MS = 500;
    const POLL_TIMEOUT_MS = 60_000;

    async function waitForMessage(msgId) {
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        const msg = await opencode.client.session.message({
          path: { id: sessionId, messageID: msgId },
        });
        const info = msg?.data?.info ?? msg?.info;
        // Message is done when finish is set or time.completed is present
        if (info?.finish || info?.time?.completed) {
          const parts = msg?.data?.parts ?? msg?.parts ?? [];
          const textPart = parts.find(p => p.type === 'text');
          return textPart?.text ?? '';
        }
        // Check for error
        if (info?.error) {
          throw new Error(info.error?.data?.message ?? JSON.stringify(info.error));
        }
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      }
      throw new Error(`Timed out waiting for message ${msgId}`);
    }

    // Execute all 3 tasks in parallel
    console.log(`[${timestamp}] Firing 3 parallel prompts...`);
    const taskPromises = tasks.map(async (task) => {
      const taskStart = Date.now();
      try {
        // session.prompt returns immediately with the assistant message shell (no parts yet)
        const promptResult = await opencode.client.session.prompt({
          path: { id: sessionId },
          body: {
            parts: [{ type: 'text', text: task.prompt }],
          },
        });

        const msgId = promptResult?.data?.info?.id ?? promptResult?.info?.id;
        if (!msgId) {
          throw new Error(`No message ID returned for task "${task.name}"`);
        }
        console.log(`[${timestamp}] Task "${task.name}" message ID: ${msgId}`);

        // Poll until the model finishes
        const responseText = await waitForMessage(msgId);
        const duration = Date.now() - taskStart;
        console.log(`[${timestamp}] Task "${task.name}" completed in ${duration}ms`);

        return {
          task: task.name,
          result: responseText.trim(),
          duration,
        };
      } catch (err) {
        const duration = Date.now() - taskStart;
        console.error(`[${timestamp}] Task "${task.name}" failed: ${err.message}`);
        return {
          task: task.name,
          result: `Error: ${err.message}`,
          duration,
        };
      }
    });

    const results = await Promise.all(taskPromises);

    // Clean up
    await opencode.server.close();

    const elapsed = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Response: 200 OK (${elapsed}ms)`);

    return res.status(200).json({
      ok: true,
      results,
      totalDuration: elapsed,
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
