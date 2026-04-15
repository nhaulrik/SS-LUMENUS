# Technical Debt

**Last Updated**: 2026-04-15  
**Review Cycle**: Monthly  
**Relevant Links**: [INFRASTRUCTURE.md](./INFRASTRUCTURE.md), [PERFORMANCE.md](./PERFORMANCE.md)

---

## Overview

Known issues, blocking concerns, and technical debt organized by severity (P0/P1/P2).

---

## 🔴 P0: Critical (Must Fix Before Production)

### None Currently

All P0 issues have been resolved in Phase 1.

---

## 🟠 P1: High Priority (Next 2-4 Weeks)

### 1. State Management Scalability

**Issue**: React hooks-based state management (useState/useCallback) works for current scope but will become unwieldy with collaboration features.

**Impact**: 
- As features grow (comments, real-time sync, undo/redo), component prop drilling increases
- Harder to trace state changes
- Difficult to implement undo/redo

**Current Scope**: 
- App.jsx manages: step, activeFlow, htmlUploadSession, htmlProject, htmlApplied, htmlRecipe, toast, debugContext
- 80+ lines of state management logic

**Symptom**: 
- Prop drilling in HtmlUploadStep (receives 10+ props)
- Hard to implement undo/redo for zone edits

**Solution**: 
Consider Zustand or Redux when Phase 5 (Collaboration) begins. Zustand is recommended for simplicity.

**Effort**: Medium (refactor ~3 days)

**Blocking**: Phase 5 (Collaboration) — undo/redo, real-time sync

---

### 2. Database Integration

**Issue**: Currently all data is in-memory (lost on server restart).

**Impact**:
- Projects are not persisted
- No version history or audit logs
- Can't implement collaboration features
- Can't implement analytics

**Current Scope**:
- Projects stored in memory: `server/temp/` directory
- Chain files created but not queryable
- No user accounts or permissions

**Symptom**:
- Server restart loses all work
- No way to track who changed what
- Can't share projects between users

**Solution**: 
Add PostgreSQL + migrations for projects, zones, versions, audit logs.

**Effort**: Large (1–2 weeks)

**Blocking**: 
- Phase 5 (Collaboration)
- Phase 6 (Analytics)
- Production deployment

**Recommended Approach**:
1. Set up PostgreSQL locally
2. Create migrations for: users, projects, zones, versions, audit_logs
3. Refactor backend to use database
4. Add connection pooling
5. Add backup/restore procedures

---

### 3. File Storage

**Issue**: Output files stored on local disk; not scalable for multi-instance deployment.

**Impact**:
- Can't scale horizontally (multiple servers)
- Files lost if server restarts
- No backup mechanism
- Disk space grows unbounded

**Current Scope**:
- Output files in `server/chains/` directory
- No cleanup or retention policy
- No S3 integration

**Symptom**:
- Server restart loses output files
- Can't deploy to cloud (Heroku, AWS, etc.)
- Disk usage grows without limit

**Solution**: 
Integrate S3 (or equivalent: Azure Blob, Google Cloud Storage) for file storage.

**Effort**: Medium (3–5 days)

**Blocking**: Production deployment

**Recommended Approach**:
1. Add AWS SDK to dependencies
2. Create S3 client abstraction
3. Update file upload/download routes to use S3
4. Add signed URLs for secure downloads
5. Set up lifecycle policies (cleanup old files)

---

### 4. API Authentication & Authorization

**Issue**: No authentication; any user can access any project.

**Impact**:
- Security risk: users can access others' projects
- No user isolation
- Can't implement sharing/permissions
- Compliance issue for enterprise

**Current Scope**:
- All endpoints public (no auth middleware)
- No user accounts
- No permission checks

**Symptom**:
- Anyone with server URL can access all projects
- No way to restrict access
- Can't track who owns what

**Solution**: 
Add JWT auth + RBAC middleware.

**Effort**: Medium (1 week)

**Blocking**: 
- Production deployment
- Phase 5 (Collaboration)

**Recommended Approach**:
1. Add JWT library (jsonwebtoken)
2. Create auth routes (login, register, refresh)
3. Add auth middleware to all endpoints
4. Create RBAC system (viewer, editor, admin)
5. Add permission checks to routes

---

### 5. Error Handling Consistency

**Issue**: Error messages vary in tone and clarity; some errors are silent.

**Impact**:
- Users confused about what went wrong
- Hard to debug issues
- Inconsistent UX across app

**Current Scope**:
- Some errors shown in Toast, some in console
- Error messages range from cryptic to helpful
- No error boundary for uncaught exceptions

**Symptom**:
- User uploads invalid HTML, sees generic "Error" message
- Server error returns raw stack trace
- Some failures silently fail

**Solution**: 
Standardize error messages; add error boundary for uncaught exceptions.

**Effort**: Small (2–3 days)

**Blocking**: None (but improves UX significantly)

**Recommended Approach**:
1. Create error code system (HTML_PARSE_ERROR, ZONE_CONFLICT, etc.)
2. Create user-friendly error messages for each code
3. Update all error handlers to use system
4. Add ErrorBoundary to catch React errors
5. Add server-side error logging

---

## 🟡 P2: Medium Priority (Next 1-2 Months)

### 1. CSS Token Completeness

**Issue**: Some hardcoded rgba() values remain (46 instances) due to prior circular token references.

**Impact**:
- Design system not fully leveraged
- Harder to maintain consistency
- Harder to change colors globally

**Current Scope**:
- Most colors are token variables
- 46 hardcoded rgba() values in index.css
- Some colors in inline styles

**Symptom**:
- Can't change accent color without editing multiple places
- Inconsistent color usage

**Solution**: 
Audit and consolidate all colors into token variables.

**Effort**: Small (2–3 days)

**Recommended Approach**:
1. Find all hardcoded colors: `grep -r "rgba\|#[0-9a-f]" client/src/`
2. Create tokens for each color
3. Replace hardcoded values with tokens
4. Add CSS variable validation to linter

---

### 2. Keyboard Navigation Coverage

**Issue**: Some UI elements lack full keyboard support (e.g., tree expand/collapse via arrow keys).

**Impact**:
- Power users and accessibility advocates may find workflow slow
- Screen reader users can't navigate efficiently

**Current Scope**:
- Tab navigation works
- Arrow keys don't work in tree
- No keyboard shortcuts (e.g., Ctrl+S to save)

**Symptom**:
- Users must click to expand tree nodes
- No way to navigate slides with keyboard

**Solution**: 
Add arrow key navigation to tree, Tab cycling through slides, etc.

**Effort**: Small (2–3 days)

**Recommended Approach**:
1. Add arrow key handlers to tree nodes
2. Add arrow key handlers to slide tabs
3. Add keyboard shortcuts (Ctrl+S, Ctrl+Z, etc.)
4. Document shortcuts in help modal

---

### 3. Performance: Image Optimization

**Issue**: Large HTML templates with images can slow parsing.

**Impact**:
- Upload time increases for image-heavy templates
- Preview rendering sluggish
- Memory usage high

**Current Scope**:
- No image optimization on upload
- All images embedded in preview
- No lazy loading

**Symptom**:
- 5MB template with 50 images takes 2+ seconds to parse
- Preview rendering is slow

**Solution**: 
Lazy-load images in preview; optimize template size validation.

**Effort**: Small (2–3 days)

**Recommended Approach**:
1. Add image lazy-loading to preview iframe
2. Compress images on upload (sharp library)
3. Add image size validation
4. Cache compressed images

---

### 4. Documentation

**Issue**: Only spec documents; no user guide, API docs, or deployment guide.

**Impact**:
- Hard for new contributors to onboard
- Hard for users to understand workflow
- No deployment instructions

**Current Scope**:
- ✅ SPEC-visual-flow.md
- ✅ SPEC-repeatable-slides.md
- ✅ .impeccable.md
- ❌ README.md
- ❌ API.md
- ❌ DEPLOYMENT.md
- ❌ USER_GUIDE.md

**Symptom**:
- New developers ask "how do I run this?"
- Users ask "how do I upload a file?"
- No deployment guide for production

**Solution**: 
Create comprehensive documentation.

**Effort**: Medium (1 week)

**Recommended Approach**:
1. Create README.md (overview, quick start, architecture)
2. Create API.md (OpenAPI spec)
3. Create DEPLOYMENT.md (production setup)
4. Create USER_GUIDE.md (step-by-step tutorial)
5. Create CONTRIBUTING.md (dev workflow)

---

## 📊 Debt Summary

| Issue | Severity | Effort | Blocking | Status |
|-------|----------|--------|----------|--------|
| State Management | P1 | Medium | Phase 5 | 📋 Planned |
| Database | P1 | Large | Phase 5, 6, Prod | 🔴 Blocking |
| File Storage | P1 | Medium | Prod | 🔴 Blocking |
| Auth | P1 | Medium | Phase 5, Prod | 🔴 Blocking |
| Error Handling | P1 | Small | None | 📋 Planned |
| CSS Tokens | P2 | Small | None | 📋 Planned |
| Keyboard Nav | P2 | Small | None | 📋 Planned |
| Image Optimization | P2 | Small | None | 📋 Planned |
| Documentation | P2 | Medium | None | 📋 Planned |

---

## Production Blockers

These issues **must** be fixed before shipping to production:

1. ✅ Authentication (API security)
2. ✅ Database (data persistence)
3. ✅ File storage (scalability)
4. ✅ Error handling (user experience)

**Current Status**: All 4 are P1 and unstarted.

**Recommended Timeline**:
- Week 1: Database setup + migrations
- Week 2: File storage (S3) integration
- Week 3: Authentication (JWT + RBAC)
- Week 4: Error handling standardization

**Total**: ~4 weeks before production ready

---

## Notes

### Dependency Order
1. Database (enables everything else)
2. File storage (enables multi-instance)
3. Auth (enables multi-user)
4. Error handling (improves UX)

### Recommendation
Start database work immediately if planning Phase 5 or production deployment within 6 weeks.

---

**Next Review**: 2026-05-15  
**Questions?** See [README.md](./README.md) or check [INFRASTRUCTURE.md](./INFRASTRUCTURE.md).
