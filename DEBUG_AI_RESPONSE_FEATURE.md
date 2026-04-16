# Debug Button AI Response Integration

## Overview

The Debug button has been expanded to include the AI JSON response that users paste into the "JSON Response" field. This allows users to share their complete debugging context including:

1. **Raw AI Response** — The exact JSON string the user pasted
2. **Validation Status** — Whether the JSON was validated
3. **Validation Results** — The server's validation response (valid/invalid, found fields, missing fields, instance count)

## Implementation Details

### Architecture

The implementation follows the existing pattern for other debug fields (Raw HTML, Recipe, Output HTML) and maintains consistency with the current codebase structure.

```
User pastes JSON
        ↓
HtmlRecipeStep.validateJson()
        ↓
Calls onAiResponseChange() callback
        ↓
App.jsx updates htmlAiResponse state
        ↓
Debug context includes aiResponse field
        ↓
DebugContextModal displays AI Response toggle
        ↓
User can include/exclude AI response when copying
```

### Components Modified

#### 1. **App.jsx**
- **New State**: `htmlAiResponse` — Tracks the AI response data
- **New Callback**: `handleHtmlAiResponseChange` — Updates AI response state
- **Debug Context**: Added `aiResponse` field to debugContext object
- **Props**: Added `onAiResponseChange` prop to HtmlRecipeStep

#### 2. **HtmlRecipeStep.jsx**
- **New Prop**: `onAiResponseChange` — Callback to lift AI response to App
- **Updated validateJson()**: Now calls `onAiResponseChange()` with:
  - `raw`: The JSON string as-is
  - `validated`: Boolean flag (true when validation completes)
  - `validationResult`: The server's validation response

#### 3. **DebugContextModal.jsx**
- **New State**: `includeAiResponse` — Toggle for AI response inclusion
- **New Check**: `hasAiResponse` — Detects if AI response is available
- **Updated Filter**: Strips/includes aiResponse based on toggle
- **New UI**: Added "AI Response" toggle matching existing toggle pattern
- **Updated Dependencies**: Added aiResponse to memo dependencies

### Data Structure

**AI Response Object** (when user pastes JSON):
```javascript
{
  raw: string,                    // The JSON string as pasted
  validated: boolean,             // True after validation attempt
  validationResult: {
    valid: boolean,
    error: string | null,
    foundFields: string[],
    missingFields: string[],
    instanceCount: number
  }
}
```

**When no JSON is pasted**: `aiResponse` is `null`

### User Flow

1. **Recipe Step**: User receives AI recipe prompt
2. **Paste JSON**: User pastes AI response into "JSON Response" field
3. **Validation**: System validates JSON (debounced 400ms)
4. **Debug Context Updated**: `aiResponse` is populated with raw JSON and validation results
5. **Debug Button**: User clicks "Debug" to open modal
6. **AI Response Toggle**: Toggle checkbox to include/exclude AI response
7. **Copy**: Click "Copy" to copy debug context with or without AI response

### Alignment with Existing Implementation

The implementation strictly follows the existing pattern:

| Aspect | Implementation |
|--------|-----------------|
| **State Management** | App.jsx state + callbacks, same as htmlRecipe, htmlProject, htmlApplied |
| **Data Lifting** | onAiResponseChange callback, same pattern as onRecipeChange |
| **Toggle Pattern** | Same checkbox pattern as Raw HTML, Recipe, Output HTML |
| **CSS Classes** | Uses existing `debug-include-option`, `debug-include-na` classes |
| **Serialization** | Included in JSON.stringify() with other context fields |
| **Conditional Rendering** | Shows "not available" when aiResponse is null |

### Testing Strategy (TDD)

Tests were written first to verify:

1. **Toggle Rendering**: AI Response toggle appears when data is available
2. **Toggle Functionality**: Checking/unchecking includes/excludes AI response
3. **Data Structure**: aiResponse has correct shape with raw JSON and validation results
4. **Copy Integration**: Copied JSON includes aiResponse when toggle is enabled
5. **State Persistence**: Toggle state is maintained when switching between toggles
6. **Backward Compatibility**: Works with null aiResponse (no JSON pasted yet)
7. **Alignment**: Uses same patterns as existing toggles

### Files Changed

```
client/src/App.jsx
  - Added htmlAiResponse state
  - Added handleHtmlAiResponseChange callback
  - Added aiResponse to debugContext
  - Passed onAiResponseChange to HtmlRecipeStep

client/src/steps/HtmlRecipeStep.jsx
  - Added onAiResponseChange prop
  - Updated validateJson to call onAiResponseChange
  - Clears aiResponse when JSON input is empty

client/src/components/DebugContextModal.jsx
  - Added includeAiResponse state
  - Added hasAiResponse check
  - Updated filtered memo to handle aiResponse
  - Added AI Response toggle to UI
  - Updated memo dependencies

client/src/__tests__/DebugContextModal.test.jsx (NEW)
  - Tests for AI Response toggle rendering
  - Tests for toggle functionality
  - Tests for data structure
  - Tests for copy integration
  - Tests for state persistence
  - Tests for backward compatibility
  - Tests for alignment with existing patterns

client/src/__tests__/App.debugContext.test.jsx (NEW)
  - Tests for AI response structure in debug context
  - Tests for validation integration
  - Tests for context passing to modal
  - Tests for HtmlRecipeStep integration
  - Tests for backward compatibility
  - Tests for state preservation
```

## Usage Example

### Before (No AI Response in Debug)
```json
{
  "timestamp": "2026-04-16T08:44:45.000Z",
  "step": "html-recipe",
  "activeFlow": "html",
  "uploadSession": {...},
  "project": {...},
  "recipe": "GENERATE THE FOLLOWING DATA:...",
  "applied": null
}
```

### After (With AI Response Toggle Enabled)
```json
{
  "timestamp": "2026-04-16T08:44:45.000Z",
  "step": "html-recipe",
  "activeFlow": "html",
  "uploadSession": {...},
  "project": {...},
  "recipe": "GENERATE THE FOLLOWING DATA:...",
  "applied": null,
  "aiResponse": {
    "raw": "{\"slides\":{\"slide_1\":{\"instances\":[{\"header\":\"Test\"}]}}}",
    "validated": true,
    "validationResult": {
      "valid": true,
      "error": null,
      "foundFields": ["header"],
      "missingFields": [],
      "instanceCount": 1
    }
  }
}
```

## Benefits

1. **Complete Debugging Context**: Users can now share the exact AI response they received
2. **Validation Feedback**: Debug context includes validation results, helping identify issues
3. **Consistency**: Follows existing patterns, easy to understand and maintain
4. **Flexibility**: Users can choose to include/exclude AI response based on sensitivity
5. **Non-Breaking**: Fully backward compatible, works with older debug contexts

## Future Enhancements

Potential improvements:
- Store AI response history (multiple attempts)
- Compare validation results across attempts
- Export/import debug contexts
- Automatic validation result analysis
