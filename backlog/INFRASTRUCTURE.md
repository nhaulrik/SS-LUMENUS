# Infrastructure & Deployment

**Last Updated**: 2026-04-15  
**Review Cycle**: Quarterly  
**Relevant Links**: [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md), [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Overview

DevOps, deployment, database, authentication, monitoring, and production readiness.

---

## Current Setup

### Local Development
```bash
npm run dev                # Start server + client (concurrent)
npm test                   # Run unit tests
npm run test:e2e:html      # Run E2E tests
npm run build              # Build client (Vite)
```

### Testing
- **Unit Tests**: Vitest (227 tests, 100% passing)
- **E2E Tests**: Playwright (142 tests, 100% passing)
- **Coverage**: 100% of critical paths

### Build
- **Frontend**: Vite (fast, excellent HMR)
- **Backend**: Node.js (no build needed)
- **Output**: `client/dist/` (Vite build)

---

## Production Readiness Checklist

### 🔴 BLOCKING (Must Complete Before Production)

- [ ] **Database Integration**
  - [ ] PostgreSQL setup (local + cloud)
  - [ ] Schema design (users, projects, zones, versions, audit_logs)
  - [ ] Migrations (Flyway or Knex)
  - [ ] Connection pooling (pgBouncer)
  - [ ] Backup/restore procedures
  - Effort: 1–2 weeks
  - Blocking: Phases 5 & 6, persistence

- [ ] **File Storage**
  - [ ] S3 (or Azure Blob, Google Cloud Storage)
  - [ ] Upload/download integration
  - [ ] Signed URLs for security
  - [ ] Lifecycle policies (cleanup old files)
  - [ ] Backup strategy
  - Effort: 3–5 days
  - Blocking: Multi-instance deployment

- [ ] **Authentication & Authorization**
  - [ ] JWT implementation
  - [ ] User registration/login endpoints
  - [ ] Password hashing (bcrypt)
  - [ ] Session management
  - [ ] RBAC middleware (viewer, editor, admin)
  - [ ] Permission checks on all endpoints
  - Effort: 1 week
  - Blocking: Multi-user support

- [ ] **Error Handling & Logging**
  - [ ] Standardized error codes
  - [ ] User-friendly error messages
  - [ ] Error logging (file or service)
  - [ ] Error monitoring (Sentry, Rollbar)
  - [ ] Error boundary in React
  - Effort: 2–3 days
  - Blocking: Production support

### 🟠 HIGH PRIORITY (Next 2-4 Weeks)

- [ ] **Environment Configuration**
  - [ ] .env file for secrets
  - [ ] Environment-specific configs (dev, staging, prod)
  - [ ] Secret management (AWS Secrets Manager, Vault)
  - [ ] Database connection strings
  - [ ] API keys (LLM providers, etc.)
  - Effort: 1–2 days

- [ ] **API Security**
  - [ ] HTTPS enforcement
  - [ ] CORS configuration
  - [ ] Rate limiting
  - [ ] Input validation & sanitization
  - [ ] SQL injection prevention (use parameterized queries)
  - [ ] XSS prevention
  - [ ] CSRF protection (if needed)
  - Effort: 3–5 days

- [ ] **Containerization**
  - [ ] Docker image for backend
  - [ ] Docker image for frontend (nginx)
  - [ ] Docker Compose for local development
  - [ ] Multi-stage build for optimization
  - Effort: 1–2 days

- [ ] **CI/CD Pipeline**
  - [ ] GitHub Actions workflow
  - [ ] Automated tests on PR
  - [ ] Automated build on merge
  - [ ] Automated deployment on tag
  - [ ] Staging environment
  - Effort: 2–3 days

### 🟡 MEDIUM PRIORITY (Next 1-2 Months)

- [ ] **Monitoring & Observability**
  - [ ] Application Performance Monitoring (APM)
  - [ ] Logging aggregation (ELK, Datadog, etc.)
  - [ ] Metrics collection (CPU, memory, requests)
  - [ ] Alerting (PagerDuty, Slack)
  - [ ] Uptime monitoring
  - [ ] Error tracking (Sentry)
  - Effort: 1–2 weeks

- [ ] **Deployment Strategy**
  - [ ] Choose platform (Heroku, AWS, DigitalOcean, etc.)
  - [ ] Infrastructure as Code (Terraform, CloudFormation)
  - [ ] Auto-scaling configuration
  - [ ] Load balancing
  - [ ] Blue-green deployment
  - Effort: 2–3 weeks

- [ ] **Database Optimization**
  - [ ] Indexing strategy
  - [ ] Query optimization
  - [ ] Connection pooling tuning
  - [ ] Backup automation
  - [ ] Disaster recovery plan
  - Effort: 1–2 weeks

- [ ] **Security Hardening**
  - [ ] Penetration testing
  - [ ] Security audit
  - [ ] Dependency scanning (Snyk, Dependabot)
  - [ ] OWASP compliance
  - [ ] Data encryption (at rest, in transit)
  - Effort: 2–3 weeks

### 🟢 LOW PRIORITY (Later)

- [ ] **Documentation**
  - [ ] Deployment guide
  - [ ] Operations runbook
  - [ ] Incident response playbook
  - [ ] Architecture decision records (ADRs)
  - Effort: 1 week

- [ ] **Advanced Features**
  - [ ] Multi-region deployment
  - [ ] Database replication
  - [ ] Cache layer (Redis)
  - [ ] CDN for static assets
  - [ ] Message queue (for async jobs)
  - Effort: 4–6 weeks

---

## Recommended Deployment Path

### Phase 1: Single-Instance (Weeks 1-2)
**Goal**: Get to production with single server

1. Set up PostgreSQL (RDS or self-hosted)
2. Implement authentication (JWT)
3. Integrate S3 for file storage
4. Add error handling & logging
5. Docker containerization
6. Deploy to Heroku or DigitalOcean

**Effort**: ~3 weeks  
**Cost**: ~$50–100/month

### Phase 2: Production-Ready (Weeks 3-4)
**Goal**: Add monitoring, scaling, security

1. Set up monitoring (Datadog or New Relic)
2. Add CI/CD pipeline (GitHub Actions)
3. Security hardening
4. Load testing
5. Disaster recovery plan

**Effort**: ~2 weeks  
**Cost**: ~$100–200/month

### Phase 3: Scale (Weeks 5+)
**Goal**: Multi-instance, multi-region

1. Infrastructure as Code (Terraform)
2. Auto-scaling configuration
3. Database replication
4. Cache layer (Redis)
5. CDN for static assets

**Effort**: ~4 weeks  
**Cost**: ~$500+/month

---

## Recommended Tech Stack (Production)

### Database
- **PostgreSQL 14+** (RDS or self-hosted)
- **PgBouncer** for connection pooling
- **Flyway** for migrations

### File Storage
- **AWS S3** (or Azure Blob, Google Cloud Storage)
- **Signed URLs** for secure downloads

### Hosting
- **AWS EC2** or **DigitalOcean** (VPS)
- **Docker** for containerization
- **Nginx** for reverse proxy

### Monitoring
- **Datadog** or **New Relic** (APM)
- **Sentry** (error tracking)
- **CloudWatch** (AWS logs)

### CI/CD
- **GitHub Actions** (already integrated)
- **Docker Hub** or **ECR** (image registry)

### Security
- **AWS Secrets Manager** (secret management)
- **Snyk** (dependency scanning)
- **Let's Encrypt** (SSL certificates)

---

## Environment Variables

### Backend (.env)
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/solon
JWT_SECRET=<random-secret>
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
S3_BUCKET=solon-files
SENTRY_DSN=<sentry-url>
```

### Frontend (.env)
```
VITE_API_URL=https://api.solon.app
VITE_ENVIRONMENT=production
```

---

## Scaling Considerations

### Horizontal Scaling
- **Load Balancer**: Nginx or AWS ALB
- **Stateless Backend**: Move sessions to Redis/database
- **Shared File Storage**: S3 (not local disk)
- **Shared Database**: PostgreSQL (not in-process)

### Vertical Scaling
- **Larger VM**: More CPU, RAM
- **Database Optimization**: Indexes, query optimization
- **Caching**: Redis for frequently accessed data
- **CDN**: CloudFront for static assets

### Performance Optimization
- **Connection Pooling**: PgBouncer or pgpool
- **Query Optimization**: Analyze slow queries
- **Caching Strategy**: Redis for hot data
- **Compression**: gzip for responses
- **Code Splitting**: Already done with Vite

---

## Disaster Recovery

### Backup Strategy
- **Database**: Daily backups, 30-day retention
- **Files**: S3 versioning enabled, lifecycle policies
- **Code**: GitHub (already version controlled)

### Recovery Procedures
- **Database Restore**: < 1 hour
- **File Restore**: < 30 minutes
- **Application Restore**: < 15 minutes

### RTO/RPO Targets
- **RTO** (Recovery Time Objective): < 1 hour
- **RPO** (Recovery Point Objective): < 1 day

---

## Cost Estimation

### Minimal Setup (Single Instance)
- **Compute**: $20–50/month (EC2 t3.small or DigitalOcean)
- **Database**: $15–30/month (RDS t3.micro or managed)
- **Storage**: $5–10/month (S3 or equivalent)
- **Monitoring**: $0–20/month (free tier or basic)
- **Total**: ~$40–110/month

### Production Setup (Multi-Instance)
- **Compute**: $100–300/month (multiple instances)
- **Database**: $50–200/month (managed, replicated)
- **Storage**: $20–100/month (S3 with lifecycle)
- **Monitoring**: $50–200/month (Datadog, etc.)
- **CDN**: $10–50/month (CloudFront)
- **Total**: ~$230–850/month

### Enterprise Setup (Multi-Region)
- **Compute**: $500+/month
- **Database**: $200+/month (replicated)
- **Storage**: $100+/month
- **Monitoring**: $200+/month
- **CDN**: $100+/month
- **Total**: $1000+/month

---

## Security Checklist

### Before Production
- [ ] HTTPS enabled (SSL certificate)
- [ ] Authentication implemented (JWT)
- [ ] Authorization checks on all endpoints
- [ ] Input validation on all forms
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (HTML escaping)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Secrets not in code or logs
- [ ] Dependencies scanned (Snyk, Dependabot)
- [ ] OWASP Top 10 reviewed
- [ ] Penetration testing completed
- [ ] Security audit passed
- [ ] Incident response plan documented

---

## Operations Runbook

### Daily
- [ ] Monitor error logs
- [ ] Check system health (CPU, memory, disk)
- [ ] Verify backups completed

### Weekly
- [ ] Review performance metrics
- [ ] Update dependencies (if needed)
- [ ] Test backup restoration

### Monthly
- [ ] Security audit
- [ ] Capacity planning
- [ ] Performance optimization review
- [ ] User feedback analysis

### Quarterly
- [ ] Full disaster recovery drill
- [ ] Security penetration test
- [ ] Architecture review
- [ ] Cost optimization

---

## Notes

### Recommendation
Start with Phase 1 (single-instance) to validate product-market fit. Scale to Phase 2 when revenue justifies cost. Phase 3 only for enterprise customers.

### Timeline
- **Phase 1**: 3 weeks (ready for beta)
- **Phase 2**: 2 weeks (ready for production)
- **Phase 3**: 4 weeks (ready for enterprise)

### Budget
- **Phase 1**: ~$500 setup + $50/month
- **Phase 2**: ~$2000 setup + $200/month
- **Phase 3**: ~$10000 setup + $1000/month

---

**Next Review**: 2026-06-15  
**Questions?** See [README.md](./README.md) or check [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md).
