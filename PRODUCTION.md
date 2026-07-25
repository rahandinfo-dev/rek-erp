# REK ERP — Production Runbook

Enterprise production notes for deploying and operating REK without changing business logic.

## Prerequisites

- Node.js 20+
- PostgreSQL
- Environment variables:
  - `DATABASE_URL`
  - `JWT_SECRET` (≥ 16 chars, **required in production**)
  - SMTP vars for email (verification / password reset)

## Commands

```bash
npm ci
npx prisma generate
npx prisma db push   # or migrate deploy in CI
npm run build
npm start
```

Quality gates:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Health

- `GET /api/health` — public liveness/readiness (`ok`, DB probe). Use for load balancers.

## Security

- Auth: httpOnly JWT cookie, proxy gate for `/dashboard` + `/api`
- CSRF: same-origin check on mutating `/api` requests (`Origin` header)
- Rate limits: auth, search, AI chat (`lib/security/rate-limit.ts`)
- Headers: CSP, nosniff, frame, referrer, COOP/CORP, HSTS (production)
- Never log passwords/tokens (`lib/production/monitor.ts` redacts secrets)

## Performance

- Company read caches: `lib/cache/company-reads.ts` (tagged)
- Invalidation after sale/product/purchase create: `lib/cache/invalidate.ts`
- Dashboard heavy widgets: dynamic `import()` + skeletons
- Client fetch retry for idempotent GETs: `lib/api/client.ts`
- Image formats: AVIF/WebP; package import optimization for lucide/recharts

## Reliability

- Offline / reconnect: Session Recovery + Save Guard + undo offline queue
- UI crash recovery: `ErrorBoundary` around dashboard main
- Structured error logging: `monitor` / `monitorError`

## Accessibility

- Skip link to `#main-content`
- `prefers-reduced-motion` respected in `globals.css`
- Keyboard productivity shortcuts (`Ctrl+K`, `Ctrl+Shift+P`, `Ctrl+Shift+A`, …)

## Multi-instance note

In-memory rate limiting is single-node. For horizontal scale, swap the bucket store for Redis while keeping the same `rateLimit()` API.
