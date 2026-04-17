# SOLON Codebase Patterns & Conventions

## 1. EXPRESS ROUTE PATTERNS

### Export Pattern
Routes are exported as **default exports** using ES6 modules:
```javascript
const router = express.Router();
// ... route definitions ...
export default router;
```

### Route Structure (ai-proxy.js)
```javascript
import express from 'express';
import { callAi } from '../lib/ai-client.js';

const router = express.Router();

router.post('/ai-proxy/generate', async (req, res) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  const { prompt, model, temperature, maxTokens } = req.body;

  console.log(`[${timestamp}] Request: POST /api/ai-proxy/generate`);

  // Validate required fields
  if (!prompt || typeof prompt !== 'string') {
    console.log(`[${new Date().toISOString()}] Response: 400 - Missing or invalid prompt`);
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
    console.log(`[${new Date().toISOString()}] Response: 200 OK (${elapsed}ms)`);

    return res.status(200).json({
      ok: true,
      response: result.response,
      usage: result.usage,
      latencyMs: result.latencyMs,
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
```

### Error Handling Pattern
1. **Validation first**: Check required fields before processing
2. **Status codes**: Use appropriate HTTP status codes (400, 404, 409, 500)
3. **Error responses**: Consistent JSON structure with `ok` boolean and `error` message
4. **Try/catch blocks**: Wrap async operations
5. **Logging**: Timestamped console logs for debugging

Example from projects.js:
```javascript
router.post('/', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Project name is required' });
    }
    const projectDir = resolveProjectDir(name);
    if (!projectDir) {
      return res.status(400).json({ error: 'Invalid project name. Use letters, numbers, hyphens, and underscores only.' });
    }
    if (fs.existsSync(projectDir)) {
      return res.status(409).json({ error: `Project "${name}" already exists` });
    }
    fs.mkdirSync(path.join(projectDir, 'flows'), { recursive: true });
    res.status(201).json({ ok: true, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

### Response Format
Standard JSON response structure:
- **Success**: `{ ok: true, [data fields] }`
- **Error**: `{ ok: false, error: "message" }` OR `{ error: "message" }`
- **List responses**: `{ projects: [...] }` or `{ flows: [...] }`

Example successful response:
```json
{
  "ok": true,
  "response": "AI generated text...",
  "usage": {
    "inputTokens": 150,
    "outputTokens": 250
  },
  "latencyMs": 1234
}
```

### Async/Await Usage
- Always use `async/await` for API calls and file operations
- Wrap in try/catch blocks
- Use `await` for Promise-based operations (fetch, fs promises)
- Return early from error conditions with `return res.status(...).json(...)`

---

## 2. REACT COMPONENT PATTERNS

### Component Structure (ProjectDashboardStep.jsx)

#### Imports
```javascript
import { useState, useEffect, useRef } from 'react'
import styles from './ProjectDashboardStep.module.css'
```

#### State Management
Multiple `useState` hooks for different concerns:
```javascript
const [project,        setProject]        = useState(null)
const [loading,        setLoading]        = useState(true)
const [error,          setError]          = useState(null)
const [newFlowName,    setNewFlowName]    = useState('')
const [flowNameError,  setFlowNameError]  = useState(false)

// Publish section state
const [exports,         setExports]         = useState([])
const [selectedExports, setSelectedExports] = useState(new Set())
const [publishes,       setPublishes]       = useState([])
const [publishLoading,  setPublishLoading]  = useState(false)
```

#### Refs
```javascript
const flowNameInputRef = useRef(null)
```

### API Call Pattern

#### Initial Data Load (useEffect)
```javascript
useEffect(() => {
  const load = async () => {
    try {
      const res = await fetch(`/api/projects/${projectName}`)
      if (!res.ok) throw new Error('Failed to load project')
      const data = await res.json()
      setProject(data.project)

      // Parallel requests with Promise.all
      const flows = data.project?.flows || []
      setExportsLoading(true)
      const [exportsResults, publishesRes] = await Promise.all([
        Promise.all(
          flows.map(async (flow) => {
            try {
              const r = await fetch(`/api/projects/${projectName}/flows/${flow.flowId}/exports`)
              if (!r.ok) return []
              const d = await r.json()
              const list = d.exports || d || []
              return list.map((exp, idx) => ({
                flowId:       flow.flowId,
                flowName:     flow.name || flow.flowId,
                exportId:     exp.exportId,
                exportNumber: exp.exportNumber ?? idx + 1,
                slideCount:   exp.slideCount ?? exp.slides?.length ?? 0,
                createdAt:    exp.createdAt,
              }))
            } catch {
              return []
            }
          })
        ),
        fetch(`/api/projects/${projectName}/publishes`),
      ])
      setExports(exportsResults.flat())
      setExportsLoading(false)

      if (publishesRes.ok) {
        const pd = await publishesRes.json()
        setPublishes(pd.publishes || pd || [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  load()
}, [projectName])
```

#### POST/Mutation Pattern
```javascript
const handlePublish = async () => {
  if (selectedExports.size === 0 || publishLoading) return
  setPublishLoading(true)
  try {
    const selections = [...selectedExports].map(key => {
      const [flowId, exportId] = key.split('::')
      return { flowId, exportId }
    })
    const res = await fetch(`/api/projects/${projectName}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selections }),
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || errData.message || 'Publish failed')
    }
    setToast?.({ type: 'success', message: 'Published successfully!' })
    setSelectedExports(new Set())
    await fetchPublishes()
  } catch (err) {
    setToast?.({ type: 'error', message: err.message })
  } finally {
    setPublishLoading(false)
  }
}
```

#### DELETE Pattern
```javascript
const handleDeleteFlow = async (flowId, flowDisplayName) => {
  if (!confirm(`Delete flow "${flowDisplayName}"? This cannot be undone.`)) return
  try {
    const res = await fetch(`/api/projects/${projectName}/flows/${flowId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete flow')
    setProject(prev => ({ ...prev, flows: prev.flows.filter(f => f.flowId !== flowId) }))
    setToast?.({ type: 'success', message: `Flow "${flowId}" deleted.` })
  } catch (err) {
    setToast?.({ type: 'error', message: err.message })
  }
}
```

### Error Handling & Loading States

#### Render States
```javascript
if (loading) {
  return (
    <div className={styles.container}>
      <div className={styles.loadingSpinner}>
        <div className={styles.spinner}></div>
        <p>Loading project…</p>
      </div>
    </div>
  )
}

if (error || !project) {
  return (
    <div className={styles.container}>
      <div className={styles.errorContainer}>
        <h2>Error Loading Project</h2>
        <p>{error || 'Project not found'}</p>
        <button className={styles.primaryButton} onClick={onBackToProjects}>
          Back to Projects
        </button>
      </div>
    </div>
  )
}
```

#### Loading Button States
```javascript
<button
  className={styles.publishButton}
  disabled={selectedExports.size === 0 || publishLoading}
  onClick={handlePublish}
>
  {publishLoading ? 'Publishing…' : 'Publish Selected'}
</button>
```

### CSS Module Usage

#### Import Pattern
```javascript
import styles from './ProjectDashboardStep.module.css'
```

#### Class Application
```javascript
<div className={styles.container}>
  <div className={styles.header}>
    <button className={styles.backButton} onClick={onBackToProjects}>
      ← Back
    </button>
    <h1 className={styles.projectTitle}>{project.name}</h1>
  </div>
</div>
```

#### Conditional Classes
```javascript
<input
  ref={flowNameInputRef}
  className={`${styles.newFlowInput}${flowNameError ? ` ${styles.newFlowInputError}` : ''}`}
  type="text"
  value={newFlowName}
  onChange={e => { setNewFlowName(e.target.value); setFlowNameError(false) }}
/>
```

### HtmlRecipeStep.jsx - Advanced Patterns

#### useCallback for Debounced Validation
```javascript
const validateJson = useCallback(async (value) => {
  if (!value.trim()) {
    setValidation(null)
    onAiResponseChange?.(null)
    return
  }
  try {
    const res = await fetch('/api/html-flow/validate-json', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ projectName, flowId, jsonString: value }),
    })
    if (!res.ok) throw new Error(`Server error ${res.status}`)
    const data = await res.json()
    setValidation(data)
    onAiResponseChange?.({ raw: value, validated: true, validationResult: data })
  } catch (err) {
    const errorData = { valid: false, error: 'Validation failed: ' + err.message }
    setValidation(errorData)
    onAiResponseChange?.({ raw: value, validated: true, validationResult: errorData })
  }
}, [projectName, flowId, onAiResponseChange])

const handleJsonChange = useCallback((value) => {
  setJsonInput(value)
  onRecipeStateChange?.({ jsonInput: value })
  clearTimeout(validateTimerRef.current)
  validateTimerRef.current = setTimeout(() => validateJson(value), 400)
}, [validateJson, onRecipeStateChange])
```

#### Optional Chaining & Nullish Coalescing
```javascript
const { selections = [], zones = [], repeatableSlides = [] } = project
const list = d.exports || d || []
const slideCount = exp.slideCount ?? exp.slides?.length ?? 0
```

#### Callback Props Pattern
```javascript
export default function HtmlRecipeStep({
  project,
  projectName,
  flowId,
  step,
  canNavigateTo,
  navigateTo,
  onBack,
  onApplied,        // ({ outputFile, previewHtml, roundId, slideCount }) => void
  onRecipeChange,
  onRecipeStateChange,
  onAiResponseChange,
  recipeState = { recipe: '', globalPrompt: '', jsonInput: '' },
  setToast,
  debugContext,
}) {
  // ...
  setRecipe(data.recipe)
  onRecipeChange?.(data.recipe)
  onRecipeStateChange?.({ recipe: data.recipe, generationId: data.generationId })
}
```

---

## 3. ENVIRONMENT VARIABLES

### Usage Pattern in ai-client.js

#### Reading Environment Variables
```javascript
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
```

#### Key Env Variables
- `AI_BASE_URL`: Base URL for AI API (e.g., `https://api-cortex.netcompany.com/v1`)
- `AI_API_KEY`: Authentication token for AI service
- `AI_MODEL`: Model identifier (e.g., `Cortex/claude-4-5-sonnet-vertex`)

#### API Call with Environment Variables
```javascript
async function callCortexApi(baseUrl, apiKey, model, prompt, temperature, maxTokens) {
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
```

---

## 4. COMMON PATTERNS SUMMARY

### Validation Pattern
```javascript
// Type check with helpful error message
if (!prompt || typeof prompt !== 'string') {
  return res.status(400).json({
    ok: false,
    error: 'Prompt is required and must be a string',
  });
}
```

### Logging Pattern
Timestamp-prefixed logs for debugging:
```javascript
const timestamp = new Date().toISOString();
console.log(`[${timestamp}] Request: POST /api/ai-proxy/generate`);
console.log(`[${timestamp}] Response: 200 OK (${elapsed}ms)`);
```

### State Immutability Pattern
```javascript
setProject(prev => ({ ...prev, flows: prev.flows.filter(f => f.flowId !== flowId) }))
setSelectedExports(prev => {
  const next = new Set(prev)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  return next
})
```

### Optional Props Pattern
```javascript
setToast?.({ type: 'success', message: 'Published successfully!' })
onRecipeChange?.(data.recipe)
```

### Parallel Requests Pattern
```javascript
const [exportsResults, publishesRes] = await Promise.all([
  Promise.all(flows.map(async (flow) => { /* ... */ })),
  fetch(`/api/projects/${projectName}/publishes`),
])
```

---

## 5. FILE LOCATIONS

### Routes
- `server/routes/ai-proxy.js` - AI generation endpoint
- `server/routes/projects.js` - Project and flow CRUD
- `server/routes/html-flow.js` - HTML visual flow operations
- `server/routes/publish.js` - Publishing operations

### Libraries
- `server/lib/ai-client.js` - AI API wrapper
- `server/lib/project-manager.js` - Project file operations
- `server/lib/html-recipe-builder.js` - Recipe generation
- `server/lib/html-patcher.js` - Content application

### Components
- `client/src/steps/ProjectDashboardStep.jsx` - Project overview
- `client/src/steps/HtmlRecipeStep.jsx` - Recipe generation & content
- `client/src/steps/HtmlUploadStep.jsx` - Template upload
- `client/src/steps/HtmlPreviewStep.jsx` - Preview rendering

### Styles
- `*.module.css` files use CSS Modules for component-scoped styling
- Example: `ProjectDashboardStep.module.css`
