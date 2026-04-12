# Apply Patch & Continue - Use Cases

## Overview

The "Apply Patch & Continue" feature allows users to apply generated content to slides and continue editing in the Tag Elements step without losing their configuration.
the feature can be considered as "save and continue". It should also serve as a restoration point if the user wants to go back to a previous patch.

## Use Cases

### UC1: Basic Flow - Apply and Return to Tag Step

**Preconditions:**
- User has uploaded a PPTX file
- User has tagged elements on slides
- User has generated a recipe
- User has previewed the generated slides

**Trigger:**
User clicks "Apply Patch & Continue" button in Preview step

**Expected Behavior:**
1. System applies the patch to generate new PPTX content
2. System downloads the generated PPTX file
3. System navigates user back to Tag Elements step
4. Preview section shows the generated slides

---

### UC2: Tags with Keys are Preserved

**Preconditions:**
- User has tagged elements with specific keys on slides

**Trigger:**
User clicks "Apply Patch & Continue"

**Expected Behavior:**
- After returning to Tag step, all tagged elements retain their original `key` values
- Tags on slides that still exist show in the patch table
- The feature must allow the user to work on the pptx iteratively.

---

### UC3: Hints are Preserved

**Preconditions:**
- User has tagged elements with hints (e.g., "Title of the initiative group")

**Trigger:**
User clicks "Apply Patch & Continue"

**Expected Behavior:**
- All hint values remain unchanged after applying patch

---

### UC4: AI Toggle State is Preserved

**Preconditions:**
- Some elements have AI toggle ON
- Some elements have AI toggle OFF

**Trigger:**
User clicks "Apply Patch & Continue"

**Expected Behavior:**
- AI toggle states for all tagged elements remain unchanged

---

### UC5: No Slides are Repeatable After Apply

**Preconditions:**
- One or more slides are marked as repeatable
- Repeatable config includes structure type and custom prompt

**Trigger:**
User clicks "Apply Patch & Continue"

**Expected Behavior:**
- All slides have repeatable toggle OFF
- Repeatable configuration (structure type, custom prompt) is cleared
- User can reconfigure repeatable slides for next iteration if needed

---

### UC6: Preview Shows Generated Slides

**Preconditions:**
- User has applied a patch

**Trigger:**
User returns to Tag Elements step after applying patch

**Expected Behavior:**
- Preview section is visible in Tag Elements step
- Preview shows all generated slides including new instances from repeatable slides
- User can navigate between preview slides using arrows or thumbnails

---

### UC7: Preview Shows New Repeatable Instances

**Preconditions:**
- Slide #X is marked as repeatable with custom prompt (e.g., "one instance for each initiative group")
- User generates recipe and applies patch
- AI returns multiple instances based on prompt

**Trigger:**
User returns to Tag Elements step after applying patch

**Expected Behavior:**
- Preview shows all generated instances (e.g., 6 slides if AI returned 6 instances)
- Each instance has correct content from AI response
- New slides from instances appear in preview

---

### UC8: Propagation Config is Preserved

**Preconditions:**
- User has configured non-unique or unique propagation for shared keys

**Trigger:**
User clicks "Apply Patch & Continue"

**Expected Behavior:**
- Propagation configurations remain intact
- Shared keys retain their propagation mode (non-unique/unique)

---

### UC9: Generated PPTX is Downloaded

**Preconditions:**
- User has generated and previewed slides

**Trigger:**
User clicks "Apply Patch & Continue"

**Expected Behavior:**
- Browser downloads the generated PPTX file automatically
- Filename follows convention: `{original-name}-patch-{n}.pptx`

---

### UC10: New Slides are Available for Tagging

**Preconditions:**
- User has applied a patch that generated new slides (repeatable instances)

**Trigger:**
User is back in Tag Elements step

**Expected Behavior:**
- New slides from repeatable instances appear in the slide carousel
- User can select new slides and tag elements on them
- Tagging workflow works identically to original slides

---

## Edge Cases

### EC1: Tags on Deleted Slides
If generated slides have fewer slides than original, some tags become orphaned.

**Handling:** Orphaned tags are preserved but marked as invalid. User can remove them manually.

### EC2: New Elements on Generated Slides
If generated content introduces new text elements not present in template.

**Handling:** These elements are available for tagging in the overlay when user selects the slide.

### EC3: Key Conflicts
If new slides contain text that matches existing tag keys.

**Handling:** System warns user of potential conflicts, allows manual resolution.

---

## Technical Notes

### State Preservation
The following state should be preserved:
- `tags[]` - all tag configurations
- `propagations[]` - propagation configurations

### State Reset
The following state should be reset:
- `repeatableSlides[]` - cleared
- `jsonInput` - cleared
- `validation` - cleared
- `previewData` - replaced with new preview from apply response

### API Flow
1. `POST /api/patch-chains/{chainId}/apply` - applies patch, returns previewData
2. Client uses previewData from response (no need to re-parse)
3. Client navigates to 'tag' step with updated state

---

## UC11: Patch History Navigation

**Preconditions:**
- User has applied at least one patch
- User is in Tag Elements step

**Trigger:**
User clicks on a previous patch in the patch history timeline

**Expected Behavior:**
1. System loads the state associated with that patch version:
   - `tags[]` - restored from patch
   - `propagations[]` - restored from patch
   - Slides - replaced with slides from that patch version
   - Preview data - updated to show slides from that version
2. User can continue editing from that restoration point
3. User can apply a new patch which creates a new branch or continues the timeline

**UI Requirements:**
- A timeline/visualizer showing all patches in chronological order
- Current patch is highlighted
- Clicking a patch loads its state
- Each patch shows: name, date, slide count

**Technical Implementation:**
- `PATCH_CHAIN_ID/apply` stores each patch state in the chain
- Client fetches patch state via `GET /api/patch-chains/{chainId}/patches/{patchId}`
- State restoration includes: tags, propagations, slides, previewData

---

## UC12: Branch from Previous Patch

**Preconditions:**
- User has patch history
- User wants to try a different direction from an earlier patch

**Trigger:**
User clicks "Branch from here" on a previous patch

**Expected Behavior:**
1. System creates a new branch from the selected patch
2. Current patch becomes the new branch point
3. User can apply new patches without affecting the original timeline
4. Branch is tracked separately in the chain

---

## UC13: Download Any Patch Version

**Preconditions:**
- User has multiple patches in history

**Trigger:**
User clicks download icon on any patch in the timeline

**Expected Behavior:**
- System downloads the PPTX file for that specific patch version
- Filename includes version info: `{original-name}-patch-{n}-{timestamp}.pptx`

---

## UC14: Rename Patch

**Preconditions:**
- User has applied patches

**Trigger:**
User clicks edit icon on a patch in the timeline

**Expected Behavior:**
- Inline text input appears for renaming
- User can set a descriptive name (e.g., "Added intro slides", "Revised headers")
- Name is saved and displayed in timeline

---

## Patch History Data Model

```javascript
// Chain structure stored server-side
{
  id: "chain-123",
  pptxFileName: "presentation.pptx",
  createdAt: "2024-01-01T10:00:00Z",
  rounds: [
    {
      id: "round-1",
      name: "Initial patch",
      status: "applied",
      baseFile: "original.pptx",
      outputFile: "presentation-patch-1.pptx",
      tags: [...],
      repeatableSlides: [...],
      appliedAt: "2024-01-01T10:05:00Z"
    },
    {
      id: "round-2", 
      name: "Added initiative slides",
      status: "applied",
      baseFile: "presentation-patch-1.pptx",
      outputFile: "presentation-patch-2.pptx",
      tags: [...],
      repeatableSlides: [...],
      appliedAt: "2024-01-01T10:15:00Z"
    }
  ]
}
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/patch-chains/{chainId}` | GET | Get chain info with all patches |
| `/api/patch-chains/{chainId}/patches/{patchId}` | GET | Get specific patch state |
| `/api/patch-chains/{chainId}/patches/{patchId}/restore` | POST | Restore state from patch |
| `/api/patch-chains/{chainId}/patches/{patchId}/download` | GET | Download patch PPTX |
| `/api/patch-chains/{chainId}/patches/{patchId}` | PATCH | Update patch name |

---

## UI Mockup - Patch History Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│  Patch History                                          [Close] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ○───●───○───○───○                                           │
│  1   2   3   4   5                                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Patch #5 (Current)                              12:45  │    │
│  │ Added initiative group slides                              │    │
│  │ 8 slides • Tags: 12 • Propagations: 3                  │    │
│  │                                            [Restore] [↓]  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Patch #4                                        12:30  │    │
│  │ Revised headers                                       │    │
│  │ 6 slides • Tags: 8 • Propagations: 2                  │    │
│  │                              [Restore] [↓] [✏️]        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Patch #3                                        12:15  │    │
│  │ Initial content generation                            │    │
│  │ 4 slides • Tags: 6 • Propagations: 1                  │    │
│  │                              [Restore] [↓] [✏️]        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Timeline Interactions
- **Click on any patch**: Restore that patch version
- **Hover**: Highlight the patch and show quick actions
- **Current patch**: Marked with different styling (filled circle, highlighted background)
- **Branch point**: Visual indicator when branching occurs
