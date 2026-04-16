# Phased Implementation Approach — Summary

## Why Phased?

Instead of building the entire hierarchical projects feature at once, we're breaking it into **5 self-contained phases**. Each phase:
- ✅ Provides immediate value
- ✅ Can be shipped independently
- ✅ Sets foundation for next phase
- ✅ Reduces risk and complexity
- ✅ Enables feedback between phases

---

## The 5 Phases

### Phase 1: Folder-Based Project Structure (Weeks 1-2) ← START HERE
**Goal:** Save multiple slides as individual files in a project folder

**What Users Get:**
- Click "Save Project" instead of "Download HTML"
- Enter project name
- Get ZIP with individual slide files
- Foundation for future phases

**Files Changed:**
- HtmlPreviewStep.jsx (add "Save Project" button)
- SaveProjectDialog.jsx (new component)
- html-flow.js (add 2 endpoints)
- index.css (add dialog styling)

**Value:** Users can now manage multiple slides as separate files in a folder

---

### Phase 2: Metadata Assignment UI (Weeks 3-4)
**Goal:** Let users name and type each slide before saving

**What Users Get:**
- Before saving, assign metadata to each slide
- Set slideId, name, type for each slide
- Metadata stored in project.json
- No hierarchy yet (flat structure)

**Builds On:** Phase 1 folder structure

**Value:** Slides can be named meaningfully, enabling future search/filtering

---

### Phase 3: Hierarchy Definition UI (Weeks 5-6)
**Goal:** Enable parent-child relationships between slides

**What Users Get:**
- Detect when adding to existing project
- Show parent dropdown in metadata form
- Link new slides to existing slides
- Hierarchy stored in project.json

**Builds On:** Phase 2 metadata structure

**Value:** Users can create multi-level slide hierarchies

---

### Phase 4: Interactive Web App Generation (Weeks 7-8)
**Goal:** Auto-generate browsable web app from slides

**What Users Get:**
- Web app auto-generated when saving project
- Tree navigation of slides
- Search functionality
- Filtering by type/metadata

**Builds On:** Phase 3 hierarchy structure

**Value:** End users can browse slides without file system access

---

### Phase 5: Advanced Features (Weeks 9-10)
**Goal:** Polish and extend with advanced features

**What Users Get:**
- Slide thumbnails
- Advanced filtering
- Custom themes
- PDF export
- Slide notes/descriptions

**Builds On:** Phase 4 web app

**Value:** Professional, extensible presentation tool

---

## Timeline

```
Week 1-2:   Phase 1 ████
Week 3-4:   Phase 2       ████
Week 5-6:   Phase 3           ████
Week 7-8:   Phase 4               ████
Week 9-10:  Phase 5                   ████
```

**Total: ~10 weeks for full feature**

---

## Phase 1 in Detail

### Current Behavior
```
User clicks "Download HTML"
  ↓
Single file: output-uuid.html (all slides combined)
  ↓
Downloaded to computer
```

### New Behavior (Phase 1)
```
User clicks "Save Project"
  ↓
Dialog: "Enter project name"
  ↓
Project folder created:
  my-project/
  ├── slide-1.html
  ├── slide-2.html
  └── slide-3.html
  ↓
ZIP file created and downloaded
```

### Implementation Steps

1. **Modify HtmlPreviewStep.jsx**
   - Replace "Download HTML" button with "Save Project"
   - Add state for dialog
   - Add handler for save

2. **Create SaveProjectDialog.jsx**
   - Dialog for entering project name
   - Input validation
   - Error display

3. **Update html-flow.js**
   - Add POST /api/html-flow/save-project endpoint
   - Add GET /api/html-flow/download-project endpoint
   - Extract slides from HTML
   - Create project folder
   - Generate ZIP file

4. **Add CSS Styling**
   - Dialog overlay and styling
   - Animations
   - Responsive design

5. **Write Tests**
   - Unit tests for SaveProjectDialog
   - E2E tests for complete flow
   - Manual testing checklist

### Key Files

**New Files:**
- `client/src/components/SaveProjectDialog.jsx`

**Modified Files:**
- `client/src/steps/HtmlPreviewStep.jsx`
- `server/routes/html-flow.js`
- `client/src/index.css`

### Acceptance Criteria

- ✅ "Download HTML" replaced with "Save Project"
- ✅ Dialog appears for project name
- ✅ Project folder created with individual slides
- ✅ ZIP file created and downloaded
- ✅ Each slide is valid HTML
- ✅ Input validation works
- ✅ All E2E tests pass
- ✅ No breaking changes

---

## Why Start with Phase 1?

1. **Low Risk** — Simple feature, minimal changes
2. **Foundation** — Sets up folder structure for future phases
3. **Quick Ship** — 2 weeks to production
4. **User Value** — Immediately useful (multiple files instead of single)
5. **Feedback** — Get user feedback before building metadata
6. **Team Velocity** — Small scope = fast implementation

---

## Phase 2 Preview (Not Yet)

After Phase 1 ships, Phase 2 adds:

```
Before saving → Show metadata form
  ↓
For each slide:
  - Enter slideId
  - Enter name
  - Select type
  ↓
Metadata stored in project.json
  ↓
Download ZIP with slides + project.json
```

**But we don't build this until Phase 1 ships.**

---

## Documentation Structure

### For Phase 1 Implementation

1. **IMPLEMENTATION-PHASES.md** — Overview of all 5 phases
2. **PHASE-1-DETAILED.md** — Complete Phase 1 guide with code
3. **This document** — Summary and quick reference

### For Future Phases

Each phase will have:
- **PHASE-N-DETAILED.md** — Complete implementation guide
- Code examples
- Testing checklist
- Acceptance criteria

---

## Key Principles

✅ **One Phase at a Time** — Focus on current phase only  
✅ **Ship When Done** — Don't wait for future phases  
✅ **Collect Feedback** — Adjust based on user input  
✅ **Foundation First** — Each phase builds on previous  
✅ **Self-Contained** — Each phase works independently  
✅ **Clear Success** — Each phase has acceptance criteria  

---

## Getting Started

### For Developers

1. Read **PHASE-1-DETAILED.md** thoroughly (30 min)
2. Review code examples
3. Set up local environment
4. Create branch: `feature/phase-1-folder-structure`
5. Implement SaveProjectDialog component
6. Implement endpoints
7. Write tests
8. Create PR for review

### For Designers

1. Review SaveProjectDialog design in **PHASE-1-DETAILED.md**
2. Check CSS styling
3. Verify responsive design
4. Ensure dark mode works

### For QA

1. Read **PHASE-1-DETAILED.md** testing section
2. Review E2E test examples
3. Create test cases
4. Test on multiple browsers
5. Verify backward compatibility

### For Product

1. Read this summary (5 min)
2. Review Phase 1 acceptance criteria
3. Plan Phase 2 after Phase 1 ships
4. Gather user feedback

---

## Success Looks Like

After Phase 1 ships:
- ✅ Users see "Save Project" button
- ✅ Can enter project name
- ✅ Project folder created with individual slides
- ✅ ZIP downloaded successfully
- ✅ No breaking changes to existing workflows
- ✅ Zero critical bugs
- ✅ Users find it intuitive
- ✅ Ready to start Phase 2

---

## Questions?

- **"What should I implement?"** → Read PHASE-1-DETAILED.md
- **"How do I test it?"** → See testing section in PHASE-1-DETAILED.md
- **"What about metadata?"** → That's Phase 2, not Phase 1
- **"When do we add hierarchy?"** → That's Phase 3, after Phase 2 ships
- **"What about the web app?"** → That's Phase 4, after Phase 3 ships

---

## Next Steps

1. ✅ Review this summary
2. ✅ Review PHASE-1-DETAILED.md
3. → Approve Phase 1 design
4. → Assign developers
5. → Begin implementation
6. → Ship Phase 1 (2 weeks)
7. → Gather feedback
8. → Plan Phase 2

---

**Ready to start Phase 1?** Begin with PHASE-1-DETAILED.md
