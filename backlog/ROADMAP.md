# Product Roadmap

**Last Updated**: 2026-04-15  
**Review Cycle**: Quarterly  
**Relevant Links**: [PRIORITIZED_FEATURES.md](./PRIORITIZED_FEATURES.md), [INFRASTRUCTURE.md](./INFRASTRUCTURE.md)

---

## Overview

6-phase product roadmap for SOLON Slide Studio. Each phase builds on the previous, with effort estimates and dependencies clearly marked.

---

## Phase 1: Foundation ✅ COMPLETE

**Status**: Shipped  
**Timeline**: Completed  
**Effort**: ~4 weeks  
**Scope**: HTML Visual Flow core workflow

### Deliverables
- [x] DOM tree extraction and zone assignment UI
- [x] Recipe generation from zones
- [x] JSON validation for AI responses
- [x] Content application (HTML patching)
- [x] Multi-slide preview with scroll-snap navigation
- [x] Repeatable slides with unique/non-unique zones
- [x] HTML editor with live preview
- [x] Debug context modal
- [x] Accessibility audit (WCAG AA)
- [x] Focus trapping for modals

**Metrics**: 227 unit tests, 142 E2E tests (100% passing)

**Data Flow**:
```
Upload HTML → Extract DOM tree → Assign zones → Create project
→ Generate recipe → Paste AI JSON → Validate → Apply content → Preview
```

---

## Phase 2: Advanced Zone Management

**Status**: Planned  
**Est. Timeline**: 2–3 weeks  
**Est. Effort**: ~80 hours  
**Dependencies**: Phase 1 ✅ complete  
**Blocking**: None

### 2.1 Critical Zone Features (High Priority)
- [ ] **Ignore/Exclude Zones** — Mark elements to skip AI generation even if parent is marked
  - Use case: Generate section but preserve embedded logo/disclaimer
  - Effort: 3–4 days
  
- [ ] **Full-Slide Content Generation** — Mark entire slide for generation at once
  - Use case: Generate multiple product card variants from template
  - Effort: 2–3 days
  
- [ ] **Auto-Expand to Show Assigned Zones** — Tree auto-expands to reveal pre-assigned zones
  - Use case: Re-opening project shows what's already configured
  - Effort: 1–2 days

### 2.2 Bulk Zone Operations
- [ ] Multi-select zones across slides
- [ ] Bulk rename zones with refactoring
- [ ] Bulk delete with conflict resolution
- [ ] Copy/paste zones between slides
- [ ] Undo/redo for zone edits
- Effort: ~1 week

### 2.3 Zone Templates & Presets
- [ ] Save zone configurations as reusable templates
- [ ] Quick-apply templates to new slides
- [ ] Template library (built-in + custom)
- [ ] Export/import zone templates
- Effort: ~1 week

### 2.4 Conditional Zones
- [ ] Mark zones as optional/required
- [ ] Conditional rendering based on data presence
- [ ] Validation rules per zone (min length, regex, etc.)
- [ ] Show/hide zones in UI based on conditions
- Effort: ~1 week

### 2.5 Zone History & Versioning
- [ ] Track zone edits with timestamps
- [ ] Revert to previous zone configurations
- [ ] Diff view between versions
- [ ] Zone audit log
- Effort: ~1 week

---

## Phase 3: Recipe Intelligence & Content Generation

**Status**: Planned  
**Est. Timeline**: 3–4 weeks  
**Est. Effort**: ~120 hours  
**Dependencies**: Phase 1 ✅ complete, Phase 2 optional  
**Blocking**: Database integration (Phase 5)

### 3.1 AI-Powered Zone Key Suggestions
- [ ] Auto-suggest zone keys based on element content
- [ ] Learn from user naming patterns
- [ ] Batch rename suggestions
- [ ] Keyboard shortcut to accept suggestion
- Effort: ~3 days

### 3.2 Recipe History & Management
- [ ] Save generated recipes with timestamps
- [ ] Compare recipes across versions
- [ ] Reuse previous recipes (template library)
- [ ] Recipe validation history
- Effort: ~3 days

### 3.3 Direct LLM Integration
- [ ] OpenAI API integration
- [ ] Anthropic Claude API integration
- [ ] Generic LLM provider abstraction
- [ ] API key management (secure storage)
- [ ] Rate limiting & quota tracking
- Effort: ~1 week

### 3.4 Batch Content Generation
- [ ] Queue multiple projects for generation
- [ ] Async generation with progress tracking
- [ ] Batch error handling & retry logic
- [ ] Generation history & analytics
- Effort: ~1 week

### 3.5 Generation Presets & Workflows
- [ ] Save generation settings (model, temperature, max tokens)
- [ ] Quick-apply presets to new projects
- [ ] A/B test different prompts
- [ ] Template prompts for common scenarios
- Effort: ~1 week

---

## Phase 4: Output & Export

**Status**: Planned  
**Est. Timeline**: 2–3 weeks  
**Est. Effort**: ~100 hours  
**Dependencies**: Phase 1 ✅ complete  
**Blocking**: None

### 4.1 PDF Export
- [ ] Client-side PDF rendering (html2pdf or Puppeteer)
- [ ] Preserve styling and fonts
- [ ] Multi-page PDF from multi-slide output
- [ ] Custom page sizes (A4, Letter, 16:9, etc.)
- Effort: ~1 week

### 4.2 PPTX Export (Best-Effort)
- [ ] Convert HTML slides to PPTX
- [ ] Preserve layout and styling where possible
- [ ] Embed images and fonts
- [ ] Handle limitations gracefully
- Effort: ~1 week

### 4.3 HTML Export
- [ ] Export raw HTML output
- [ ] Self-contained HTML (no external dependencies)
- [ ] Responsive HTML for web viewing
- Effort: ~2 days

### 4.4 Download Management
- [ ] Batch download multiple outputs
- [ ] ZIP archive for multi-slide exports
- [ ] Direct S3/cloud storage uploads
- [ ] Email delivery option
- Effort: ~3 days

---

## Phase 5: Collaboration & Sharing

**Status**: Planned  
**Est. Timeline**: 3–4 weeks  
**Est. Effort**: ~150 hours  
**Dependencies**: Phase 1 ✅ complete, Database integration (INFRASTRUCTURE)  
**Blocking**: Requires auth, DB, file storage

### 5.1 Project Sharing & Permissions
- [ ] Share projects with team members (view/edit/admin)
- [ ] Role-based access control (RBAC)
- [ ] Public/private project visibility
- [ ] Shareable links with expiration
- Effort: ~1 week

### 5.2 Comments & Annotations
- [ ] Comment on specific zones
- [ ] Mention team members (@user)
- [ ] Comment threads with resolution
- [ ] Notification system
- Effort: ~1 week

### 5.3 Version Control & Diff
- [ ] Track project versions with snapshots
- [ ] Diff view between versions (zones, content, recipes)
- [ ] Rollback to previous version
- [ ] Merge conflicts for collaborative editing
- Effort: ~1 week

### 5.4 Activity Log & Audit Trail
- [ ] Full audit log of all changes
- [ ] Who changed what, when, why
- [ ] Compliance-friendly export
- [ ] Retention policies
- Effort: ~1 week

---

## Phase 6: Analytics & Insights

**Status**: Planned  
**Est. Timeline**: 2–3 weeks  
**Est. Effort**: ~100 hours  
**Dependencies**: Phase 1 ✅ complete, Database integration (INFRASTRUCTURE)  
**Blocking**: Requires analytics infrastructure

### 6.1 Usage Analytics
- [ ] Track projects created, zones assigned, content generated
- [ ] Time-to-completion metrics
- [ ] Popular zone patterns
- [ ] User activity dashboard
- Effort: ~1 week

### 6.2 Content Quality Metrics
- [ ] Track AI generation quality (user ratings)
- [ ] Common AI errors or patterns
- [ ] Zone-level success rates
- [ ] Prompt effectiveness analysis
- Effort: ~3 days

### 6.3 Performance Monitoring
- [ ] Generation time per project
- [ ] API latency and error rates
- [ ] User-facing performance metrics
- [ ] Bottleneck identification
- Effort: ~3 days

---

## Timeline Visualization

```
Phase 1 ✅ COMPLETE
Phase 2 ────────────────── (2-3 weeks)
Phase 3 ────────────────────────── (3-4 weeks)
Phase 4 ────────────────── (2-3 weeks)
Phase 5 ────────────────────────── (3-4 weeks, blocked by infrastructure)
Phase 6 ────────────────── (2-3 weeks, blocked by infrastructure)

Total: ~16-21 weeks (4-5 months) for Phases 2-6
Infrastructure: 2-3 weeks (critical path blocker)
```

---

## Key Decision Points

### Database Integration (Critical Path)
**Decision**: When to implement persistent storage?  
**Impact**: Blocks Phases 5 & 6 (collaboration, analytics)  
**Options**:
- Option A: Implement after Phase 4 (recommended) — allows Phases 2-4 to proceed in parallel
- Option B: Implement before Phase 2 — adds 2-3 weeks upfront, unblocks all phases

### LLM Integration (Phase 3.3)
**Decision**: Which LLM providers to support?  
**Impact**: Affects user workflows, pricing model  
**Options**:
- Option A: OpenAI only (fastest, most popular)
- Option B: OpenAI + Claude (more flexibility)
- Option C: Generic abstraction (future-proof, more complex)

### Export Strategy (Phase 4)
**Decision**: PDF vs PPTX as primary output?  
**Impact**: User workflows, feature complexity  
**Current**: PDF is primary for Visual Flow (HTML-based)  
**Note**: PPTX is "best-effort" due to format limitations

---

## Notes

### Design System
- Keep using Geist + JetBrains Mono
- Maintain dark theme as primary
- Expand color palette only if needed
- Document new patterns in .impeccable.md

### Testing Strategy
- Maintain 100% E2E coverage for critical paths
- Add unit tests for business logic
- Consider property-based testing for edge cases

### Code Quality
- Use ESLint + Prettier for consistency
- Require code review for all PRs
- Keep components small and focused
- Document complex algorithms

---

**Next Review**: 2026-05-15  
**Questions?** See [README.md](./README.md) or check related docs.
