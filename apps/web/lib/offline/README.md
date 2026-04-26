# Offline / PWA scaffold

Status: **scaffold landed** in Commit 7 of the data-integrity rollout. The
plumbing exists; production-hardening work is intentionally deferred to a
follow-up session.

## What this slice ships

| File | Role |
| --- | --- |
| `lib/offline/idb-outbox.ts` | Typed wrapper over IndexedDB exposing a single `outbox` object store keyed by client-generated idempotency key |
| `lib/offline/sync-engine.ts` | Drains the outbox when the network comes back, replaying each pending request against the API with its original idempotency key (matches the `applications.client_idempotency_key` unique index introduced in Commit 1) |
| `lib/offline/network-state.ts` | `useOnline()` hook + raw observable for the rest of the app |
| `components/providers/pwa-provider.tsx` | Client provider that registers the service worker, wires the sync engine to network changes, and exposes the offline status via context |
| `public/service-worker.js` | Minimal SW: passes API requests through (network-first, falls back to outbox enqueue), serves a static-cache fallback for the app shell |
| `public/manifest.json` | Web app manifest |

## What this slice **does not** ship (and why)

Each item below is a focused follow-up that needs its own session because
it requires either external decisions or substantial domain-specific code.

| Item | Why deferred |
| --- | --- |
| **Workbox or full precache strategy** | Needs decisions on which routes are cached, TTLs, and the desktop-vs-mobile UX trade-off for stale data. Out of scope for the scaffold. |
| **Background Sync API integration** | Browser support varies (no Safari, partial Firefox); we currently rely on a foreground sync triggered by `online` events. Adding the BG Sync hook is straightforward once we accept the fallback path. |
| **Conflict resolution for offline edits** | Domain-specific. e.g., what happens if a student edits a draft offline while a county admin moves it forward? Needs product input on merge semantics. |
| **Encrypted at-rest cache** | The outbox stores submission payloads in the browser's IndexedDB. National-ID / birth-cert plaintext should be encrypted with a per-session key derived from the access token. Requires choosing a crypto primitive (WebCrypto AES-GCM is the obvious one) and a deterministic key derivation. |
| **Field-tested cache size budgeting** | We need to measure typical payload sizes in production data and either purge by age or evict LRU. |
| **Service-worker precache for the app shell** | The current SW network-first proxies everything; for genuine offline-first navigation we need a precache list. |

## How offline submissions flow today

1. Student fills the form offline (or experiences a transient API failure).
2. The submission helper generates a `clientIdempotencyKey` (UUID v4) and
   queues `{ key, request: { method, url, body } }` into the IDB outbox.
3. The UI renders the application as "queued for sync" and resolves the
   user's action successfully.
4. When the browser fires `online` (or the `PwaProvider` polls and detects
   reconnection), the sync engine drains the outbox in FIFO order. Each
   request includes its idempotency key as a header AND in the body so the
   backend's `applications.client_idempotency_key` unique index dedupes any
   accidental duplicates introduced by retries.
5. On 2xx, the outbox row is deleted. On 4xx, the row is moved to a
   `failed` substore for manual triage. On 5xx / network error, the row is
   left in place for the next online cycle.

## Backend contract assumptions

- The `application_submission` POST endpoint already accepts (but does not
  yet require) a `clientIdempotencyKey` field. Commit 1 added the unique
  index; the submission service in `apps/api/modules/application/` will
  short-circuit a duplicate retry with a 200 response that returns the
  existing application (vs. 201 for a new row). **TODO:** verify this code
  path is wired in `ApplicationSubmissionService.submitApplication`; if it
  isn't, that's the highest-priority follow-up.

## Next steps (priority order)

1. Wire `clientIdempotencyKey` end-to-end (frontend → submission DTO →
   service short-circuit on duplicate key).
2. Implement Workbox precache for `/dashboard`, `/programs`, `/profile`.
3. Add at-rest encryption for outbox payloads.
4. Add Background Sync API path with foreground fallback.
5. Wire conflict resolution UX for the editable-while-offline screens.
