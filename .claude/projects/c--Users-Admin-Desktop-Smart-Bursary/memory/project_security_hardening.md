---
name: Security hardening session (2026-04-24)
description: Auth/authz security audit completed — 12 gaps found and fixed across backend and frontend
type: project
---

Security audit and fixes completed on 2026-04-24. All gaps closed, no outstanding critical issues.

**Why:** Pre-production security hardening before pilot county deployment.

**How to apply:** These fixes are now in main. Any future auth changes should preserve: secure cookie flag, no manual JWT decoding outside JwtStrategy, rate limits on auth endpoints, OTP hashing, in-memory token storage.

## Fixes applied

| # | Severity | File(s) | Fix |
|---|----------|---------|-----|
| 1 | CRITICAL | auth.controller.ts | `secure: false` → `process.env.NODE_ENV === 'production'` |
| 2 | CRITICAL | roles.guard.ts | Removed unverified base64 JWT decode fallback; trust only `request.user` from JwtAuthGuard |
| 3 | CRITICAL | plan-tier.guard.ts | Same — removed `decodePayload` fallback, trust only `request.user` |
| 4 | CRITICAL | app.module.ts + auth.controller.ts | Wired `ThrottlerModule` globally (60 req/min); auth endpoints get stricter limits (5–10/min) |
| 5 | CRITICAL | auth-session.service.ts | `GET` + `DEL` → atomic `GETDEL` to prevent refresh token replay |
| 6 | HIGH | auth.service.ts | Removed now-redundant `revokeRefreshToken` call after GETDEL; removed `verify_` prefix from email token |
| 7 | HIGH | register.dto.ts, reset-password.dto.ts | `MinLength(8)` → `@IsStrongPassword` (min 8, upper+lower+digit+symbol) |
| 8 | HIGH | password-reset.service.ts | Reset OTP now stored as SHA-256 hash in DB; verified via hash comparison |
| 9 | MEDIUM | auth-token.service.ts, jwt.strategy.ts | Removed duplicate snake_case JWT claims (`county_id`, `ward_id`); camelCase only |
| 10 | MEDIUM | config/validation.ts | Added `INTERNAL_SERVICE_KEY` (min 32 chars, required); raised `JWT_SECRET` minimum to 32 chars |
| 11 | CRITICAL | apps/web/lib/token-store.ts (new) + auth.ts | Access token moved from `localStorage` to module-level JS memory only |
| 12 | HIGH | apps/web/lib/api-client.ts | Now auto-attaches `Authorization: Bearer` header; retries once after silent refresh on 401 |
