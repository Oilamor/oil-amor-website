# 🏛️ Oil Amor Enterprise Architecture

## System Design Document

---

## Executive Summary

Oil Amor is a luxury e-commerce platform built with enterprise-grade architecture principles. This document describes the technical architecture, design decisions, and operational considerations.

---

## 1. System Overview

### 1.1 Architecture Style
- **Pattern:** Micro-frontend with API-first design
- **Paradigm:** Server-side rendering (SSR) with client-side hydration
- **State Management:** Zustand (client) + Redis (server)

### 1.2 Technology Stack
```
Frontend:     Next.js 15 (App Router) + React 18 + TypeScript
Styling:      Tailwind CSS + CSS Modules
Animations:   Framer Motion
State:        Zustand + React Query
Commerce:     Stripe Checkout (Shopify removed)
CMS:          Sanity
Database:     PostgreSQL + Drizzle ORM
Cache:        Upstash Redis
Deployment:   Vercel Edge Network
Monitoring:   Vercel Analytics + Sentry
```

---

## 2. Security Architecture

### 2.1 Threat Model
| Threat | Mitigation |
|--------|-----------|
| XSS | Content Security Policy, Input sanitization |
| CSRF | CSRF tokens, SameSite cookies |
| Injection | Zod validation, Parameterized queries |
| DDoS | Rate limiting, CDN, Edge caching |
| Data Exposure | Encryption at rest, TLS in transit |

### 2.2 Security Layers
```
┌─────────────────────────────────────────┐
│  Layer 1: Edge (Vercel Edge Network)    │
│  - DDoS protection                      │
│  - WAF rules                            │
│  - SSL termination                      │
├─────────────────────────────────────────┤
│  Layer 2: Application                   │
│  - Input validation                     │
│  - Authentication                       │
│  - Rate limiting                        │
├─────────────────────────────────────────┤
│  Layer 3: Data                          │
│  - Encryption                           │
│  - Access controls                      │
│  - Audit logging                        │
└─────────────────────────────────────────┘
```

---

## 3. Data Architecture

### 3.1 Data Flow
```
User → CDN → Vercel Edge → Next.js → Shopify/Sanity
                    ↓
              Redis Cache
```

### 3.2 Caching Strategy
| Layer | TTL | Purpose |
|-------|-----|---------|
| Browser | 1 year | Static assets |
| CDN | 1 hour | Pages, API responses |
| Redis | 5 min | Cart, session data |
| Shopify | N/A | Source of truth |

---

## 4. Performance Architecture

### 4.1 Optimization Techniques
- **Images:** Next.js Image component, WebP format, responsive sizes
- **Code:** Tree shaking, dynamic imports, route prefetching
- **Network:** HTTP/2, Brotli compression, connection pooling
- **Rendering:** ISR for static pages, SSR for dynamic

### 4.2 Performance Budgets
```
First Contentful Paint:    < 1.0s
Largest Contentful Paint:  < 2.5s
Time to Interactive:       < 3.0s
Cumulative Layout Shift:   < 0.05
Total Bundle Size:         < 200KB (initial)
```

---

## 5. Scalability Design

### 5.1 Horizontal Scaling
- Stateless application design
- External session store (Redis)
- CDN for static content
- Database read replicas

### 5.2 Load Handling
| Metric | Capacity |
|--------|----------|
| Concurrent Users | 10,000+ |
| Requests/Second | 1,000+ |
| API Calls/Minute | 10,000+ |

---

## 6. Monitoring & Observability

### 6.1 Metrics
- **Performance:** Core Web Vitals, API latency
- **Business:** Conversion rate, AOV, Cart abandonment
- **Technical:** Error rate, Uptime, Resource usage

### 6.2 Alerting
| Condition | Severity | Action |
|-----------|----------|--------|
| Error rate > 1% | Critical | Page on-call |
| P95 latency > 1s | Warning | Investigate |
| Cart API down | Critical | Rollback |

---

## 7. Disaster Recovery

### 7.1 Backup Strategy
- **Data:** Daily automated backups (Shopify/Sanity)
- **Code:** Git repository with version control
- **Config:** Infrastructure as code (Terraform)

### 7.2 RPO/RTO
- **RPO (Recovery Point Objective):** 1 hour
- **RTO (Recovery Time Objective):** 30 minutes

---

## 8. Development Workflow

### 8.1 Git Strategy
```
main      → Production
develop   → Staging
feature/* → Feature branches
hotfix/*  → Emergency fixes
```

### 8.2 Deployment Pipeline
```
Code → Lint → Test → Build → Deploy → Monitor
```

---

## 9. API Design

### 9.1 REST Conventions
- **URLs:** `/api/v1/resource`
- **Methods:** GET (read), POST (create), PUT (update), DELETE (remove)
- **Responses:** JSON with consistent structure
- **Errors:** HTTP status codes + error details

### 9.2 Rate Limits
| Endpoint | Limit | Window |
|----------|-------|--------|
| /api/cart | 100 | 1 minute |
| /api/search | 60 | 1 minute |
| /api/* | 1000 | 10 minutes |

---

## 10. Future Considerations

### 10.1 Planned Enhancements
- GraphQL API layer
- Real-time inventory with WebSockets
- AI-powered product recommendations
- Multi-language support (i18n)
- PWA with offline support

### 10.2 Technical Debt
- [x] Migrate to App Router completely
- [ ] Implement GraphQL for complex queries
- [x] Add feature flag system
- [ ] Implement A/B testing framework

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Maintained By:** Principal Architect
