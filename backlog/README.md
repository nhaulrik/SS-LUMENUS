# Development Backlog

**Last Updated**: 2026-04-15  
**Current Status**: HTML Visual Flow — Stage 1 Complete (227 unit, 142 E2E tests passing)  
**Active Branch**: `html-flow`

---

## 📋 Backlog Structure

This folder organizes development work into modular documents:

### Core Planning
- **[ROADMAP.md](./ROADMAP.md)** — 6-phase product roadmap with timelines and effort estimates
- **[PRIORITIZED_FEATURES.md](./PRIORITIZED_FEATURES.md)** — Next-sprint features ranked by priority and impact

### Quality & Maintenance
- **[TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md)** — Known issues, P0/P1/P2 severity, blocking concerns
- **[PERFORMANCE.md](./PERFORMANCE.md)** — Optimization opportunities, current metrics, profiling data

### Strategy & Vision
- **[IDEAS.md](./IDEAS.md)** — Exploratory features, nice-to-haves, long-term vision (low priority)
- **[INFRASTRUCTURE.md](./INFRASTRUCTURE.md)** — DevOps, deployment, database, auth, monitoring

### Reference
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Current tech stack, directory structure, data flow

---

## 🎯 Quick Navigation

**Planning Next Sprint?**  
→ Start with [PRIORITIZED_FEATURES.md](./PRIORITIZED_FEATURES.md)

**Fixing a Bug?**  
→ Check [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md)

**Optimizing Performance?**  
→ See [PERFORMANCE.md](./PERFORMANCE.md)

**Long-term Planning?**  
→ Review [ROADMAP.md](./ROADMAP.md)

**Deploying to Production?**  
→ Use [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) checklist

---

## 📊 Status by Category

| Category | Items | Status |
|----------|-------|--------|
| Roadmap Phases | 6 | 1 ✅ Complete, 5 📋 Planned |
| Prioritized Features | 7 | 🔴 High Priority (Next Sprint) |
| Technical Debt | 6 | P0: 0, P1: 4, P2: 2 |
| Performance Optimizations | 4 | 📋 Planned |
| Infrastructure Tasks | 8 | ⚠️ Blocking Production |
| Ideas & Nice-to-Haves | 8+ | 💡 Exploratory |

---

## 🚀 How to Use

### For Sprint Planning
1. Open [PRIORITIZED_FEATURES.md](./PRIORITIZED_FEATURES.md)
2. Pick features based on effort estimates
3. Create GitHub Issues linked to this backlog
4. Reference in PR descriptions

### For Prioritization
- **P0**: Critical bugs, blocking issues
- **P1**: High-impact features, technical debt
- **P2**: Nice-to-have improvements
- **P3**: Long-term vision, exploratory

### For Tracking Progress
- Update status in each file as work completes
- Link PRs to backlog items
- Close GitHub Issues with backlog reference
- Update "Last Updated" date when reviewing

### For Communication
- Share relevant backlog files with stakeholders
- Reference in sprint planning meetings
- Include in release notes
- Use for roadmap discussions

---

## 📝 File Conventions

Each file follows this structure:

```markdown
# Title

**Last Updated**: YYYY-MM-DD
**Relevant Links**: Links to related docs/issues

## Overview
Brief summary of scope

## Items
- [ ] Item with effort estimate
- [ ] Detailed acceptance criteria
- [ ] Dependencies/blocking issues

## Notes
Context, constraints, open questions
```

---

## 🔄 Review Cycle

- **Weekly**: Update [PRIORITIZED_FEATURES.md](./PRIORITIZED_FEATURES.md) during sprint planning
- **Monthly**: Review [ROADMAP.md](./ROADMAP.md) and [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md)
- **Quarterly**: Full backlog review, update priorities
- **As-Needed**: Update [IDEAS.md](./IDEAS.md) with new suggestions

---

## 🔗 Related Documentation

- [SPEC-visual-flow.md](../docs/SPEC-visual-flow.md) — Architecture & zone model
- [SPEC-repeatable-slides.md](../docs/SPEC-repeatable-slides.md) — Repeatable slide details
- [.impeccable.md](../.impeccable.md) — Design system & accessibility

---

**Questions?** Check the relevant file or open an issue in GitHub.
