/**
 * server/lib/ai-client.js
 *
 * Thin wrapper for calling AI APIs (Anthropic Claude, OpenAI, or Cortex).
 * Supports multiple providers with unified request/response handling.
 * Cortex uses Claude Sonnet under the hood and follows Anthropic's API format.
 */

export async function callAi(prompt, options = {}) {
  const provider = 'Cortex';  // Always use Cortex
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = options.model || process.env.AI_MODEL;
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 1024;

  // Debug: log what we actually loaded
  console.log('[AI_CLIENT] Environment check:');
  console.log(`  AI_PROVIDER: ${provider}`);
  console.log(`  AI_BASE_URL: ${baseUrl ? '✓ set' : '✗ missing'}`);
  console.log(`  AI_API_KEY: ${apiKey ? '✓ set' : '✗ missing'}`);
  console.log(`  AI_MODEL: ${model ? '✓ set' : '✗ missing'}`);

  if (!baseUrl || !apiKey || !model) {
    throw new Error(
      'Missing AI configuration. Set AI_BASE_URL, AI_API_KEY, and AI_MODEL environment variables.'
    );
  }

  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log(`[${timestamp}] AI Request: provider=${provider}, model=${model}`);
  console.log(`[${timestamp}] Prompt: ${prompt.substring(0, 100)}...`);

  try {
    let response;
    let usage;

    // Always use Cortex API (OpenAI-compatible format)
    response = await callCortexApi(
      baseUrl,
      apiKey,
      model,
      prompt,
      temperature,
      maxTokens
    );
    usage = {
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
    };

    const latencyMs = Date.now() - startTime;
    const responseText = response.choices[0].message.content;

    console.log(`[${new Date().toISOString()}] AI Response: ${latencyMs}ms, tokens in=${usage.inputTokens} out=${usage.outputTokens}`);
    console.log(`[${new Date().toISOString()}] Response: ${responseText.substring(0, 100)}...`);

    return {
      response: responseText,
      usage,
      latencyMs,
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] AI Error: ${error.message}`);
    throw error;
  }
}

async function callCortexApi(baseUrl, apiKey, model, prompt, temperature, maxTokens) {
  // Cortex uses OpenAI-compatible API format
  // baseUrl is https://api-cortex.netcompany.com/v1
  const url = `${baseUrl}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-Cortex-Flatten-Vertex': 'true',
      'X-Cortex-Disable-Adaptive-Thinking': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cortex API error: ${response.status} - ${error}`);
  }

  return await response.json();
}

async function callAnthropicApi(baseUrl, apiKey, model, prompt, temperature, maxTokens) {
  const url = `${baseUrl}/v1/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  return await response.json();
}

async function callOpenAiApi(baseUrl, apiKey, model, prompt, temperature, maxTokens) {
  const url = `${baseUrl}/v1/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  return await response.json();
}
