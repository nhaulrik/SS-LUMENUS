# Performance & Optimization

**Last Updated**: 2026-04-15  
**Review Cycle**: Monthly  
**Relevant Links**: [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md), [INFRASTRUCTURE.md](./INFRASTRUCTURE.md)

---

## Overview

Current performance metrics, optimization opportunities, and profiling data.

---

## Current Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Page Load | ~1.2s | <1.5s | ✅ Good |
| HTML Parse | <100ms | <150ms | ✅ Good |
| Tree Render | <50ms | <100ms | ✅ Excellent |
| Preview Render | <200ms | <300ms | ✅ Good |
| Recipe Generation | <50ms | <100ms | ✅ Excellent |
| Bundle Size | ~450KB | <500KB | ✅ Good |

**Notes**:
- Metrics from Vite dev mode (production build TBD)
- Typical template: 1–2MB HTML, 100–200 DOM nodes
- Typical output: 3–5 slides

---

## Optimization Opportunities

### 1. Code Splitting (High Impact)

**Opportunity**: Lazy-load HtmlEditorPanel (CodeMirror is 500KB+)

**Current State**:
- CodeMirror bundled with main app
- Loaded on every page, even if user doesn't use editor
- 500KB+ added to initial bundle

**Impact**:
- Estimated savings: 30–40% initial bundle size
- Faster page load for users who don't edit HTML

**Implementation**:
```javascript
const HtmlEditorPanel = lazy(() => import('./components/HtmlEditorPanel'))
```

**Effort**: Small (1 day)

**Blocking**: None

---

### 2. Memoization (Medium Impact)

**Opportunity 1**: Memoize recipe generation
- Currently regenerates on every keystroke in recipe textarea
- Recipe is expensive to compute (traverses all zones)
- User mostly pastes, doesn't edit recipe

**Opportunity 2**: Memoize preview HTML generation
- `highlightedPreviewHtml` already memoized (good!)
- But could optimize further with useMemo on preview iframe

**Opportunity 3**: Memoize tree node rendering
- TreeNode already wrapped in React.memo (good!)

**Impact**: 5–10% improvement in interactive responsiveness

**Effort**: Small (1–2 days)

---

### 3. Image Optimization (Medium Impact)

**Opportunity 1**: Lazy-load preview iframes
- Iframes render immediately, even if off-screen
- Could defer until visible

**Opportunity 2**: Compress template images on upload
- Large images slow parsing
- Could use Sharp library to resize/compress

**Opportunity 3**: Generate responsive image sizes
- Store multiple sizes, serve appropriate size

**Impact**: 10–20% improvement for image-heavy templates

**Effort**: Medium (2–3 days)

---

### 4. Backend Optimization (Low Impact)

**Opportunity 1**: Cache zone extraction
- Same template uploaded multiple times
- Could cache parsed tree by file hash

**Opportunity 2**: Optimize HTML parsing
- Currently uses node-html-parser (good choice, but could profile)
- Benchmark against alternatives (jsdom, cheerio)

**Opportunity 3**: Add request rate limiting
- Prevent abuse
- Protect from slow client attacks

**Impact**: 5–10% improvement for repeated uploads

**Effort**: Small (2–3 days)

---

## Profiling Data

### Bundle Analysis

**Current Bundle**:
- React + React-DOM: 42KB (gzipped)
- CodeMirror: 150KB (gzipped)
- Playwright (E2E): Not in bundle
- Other dependencies: ~260KB (gzipped)
- **Total**: ~450KB (gzipped)

**Recommendation**: Code-split CodeMirror, target <300KB initial

### Runtime Performance

**Slowest Operations**:
1. HTML parsing: 50–100ms (depends on template size)
2. Tree rendering: 30–50ms (depends on node count)
3. Preview rendering: 100–200ms (depends on slide count)

**Fastest Operations**:
1. Recipe generation: 10–30ms
2. Tree node expansion: <5ms
3. Zone assignment: <5ms

### Memory Usage

**Typical Project**:
- Raw HTML: 1–2MB
- DOM tree: 5–10MB (parsed)
- Preview HTML: 2–5MB
- **Total**: ~10–20MB (reasonable)

**Large Project**:
- Raw HTML: 5MB+
- DOM tree: 20MB+
- Preview HTML: 10MB+
- **Total**: ~40MB (acceptable for modern browsers)

---

## Optimization Roadmap

### Phase 1: Quick Wins (1 week)
- [ ] Code split CodeMirror (1 day)
- [ ] Memoize recipe generation (1 day)
- [ ] Add image lazy-loading to preview (1 day)
- [ ] Benchmark HTML parsing (1 day)

**Expected Improvement**: 15–20% faster page load, 10% faster interactions

### Phase 2: Medium Effort (2 weeks)
- [ ] Compress images on upload (2 days)
- [ ] Cache zone extraction (2 days)
- [ ] Optimize tree rendering (2 days)
- [ ] Add request rate limiting (2 days)

**Expected Improvement**: 20–30% improvement for image-heavy templates

### Phase 3: Long-term (ongoing)
- [ ] Monitor real-world performance (APM)
- [ ] Implement progressive loading
- [ ] Add service worker for offline support
- [ ] Implement virtual scrolling for large trees

---

## Performance Budget

**Recommended Limits** (to prevent regression):

| Metric | Budget | Enforcement |
|--------|--------|-------------|
| Initial Bundle | <500KB gzipped | CI check |
| Page Load | <2s (3G) | Lighthouse CI |
| Tree Render | <100ms | Performance test |
| Recipe Generation | <100ms | Performance test |
| Memory (typical) | <50MB | Manual check |

---

## Monitoring Strategy

### Development
- Use Chrome DevTools Lighthouse
- Profile with Chrome Performance tab
- Monitor bundle size with `npm run build`

### Production (When Deployed)
- Set up APM (e.g., New Relic, Datadog)
- Monitor Core Web Vitals
- Alert on performance regressions

---

## Notes

### Low-Hanging Fruit
1. Code split CodeMirror (biggest win)
2. Memoize recipe generation (easiest)
3. Image lazy-loading (good UX improvement)

### Avoid Premature Optimization
- Current performance is good
- Focus on features first, optimize if needed
- Profile before optimizing

### Test Performance
- Add performance tests to CI
- Benchmark before and after optimizations
- Don't just guess

---

**Next Review**: 2026-05-15  
**Questions?** See [README.md](./README.md) or check [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md).
