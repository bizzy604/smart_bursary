/**
 * Smart Bursary service worker (Commit 7 scaffold).
 *
 * Strategy:
 *   - Static assets (CSS, JS chunks, fonts, images): cache-first with
 *     network fallback, 7-day TTL via cache versioning. The Next.js build
 *     hashes filenames so stale entries naturally evict on deploy.
 *   - HTML navigations: network-first with a cached fallback to the offline
 *     shell. We currently bake a minimal offline shell into the cache on
 *     install; a follow-up commit will switch to a Workbox precache list.
 *   - API requests (/api/...): pass through unchanged. Offline submissions
 *     are handled at the application level via lib/offline/idb-outbox.ts;
 *     the SW intentionally does NOT enqueue requests itself, because the
 *     business code needs to attach the idempotency key + branch on the
 *     specific operation (e.g., draft autosave vs. final submit).
 *
 * NOTE: This file is plain JS (not TS) because it is served as a top-level
 * script from /service-worker.js. Next does not transpile public/ files.
 */

const CACHE_VERSION = "smart-bursary-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const SHELL_CACHE = `${CACHE_VERSION}-shell`;

const SHELL_URL = "/offline";
const SHELL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Smart Bursary — Offline</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 32rem; margin: 0 auto; color: #1e3a5f; }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    p { color: #374151; line-height: 1.5; }
    code { background: #f3f4f6; padding: 0.1rem 0.25rem; border-radius: 0.25rem; }
  </style>
</head>
<body>
  <h1>You're offline</h1>
  <p>Smart Bursary keeps a local copy of your draft. Anything you've already entered is safe and will sync once you reconnect.</p>
  <p>Try refreshing this tab once your connection comes back.</p>
</body>
</html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(
        SHELL_URL,
        new Response(SHELL_HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
      );
      // Activate immediately so the new SW takes over without a page reload.
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => !name.startsWith(CACHE_VERSION))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    // POST/PUT/PATCH/DELETE are handled by the application's outbox layer.
    return;
  }
  const url = new URL(request.url);

  // Pass API calls straight through. Application-level offline UX handles
  // failures by enqueueing into IndexedDB.
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // HTML navigations: network-first, falling back to the offline shell.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          const cached = await cache.match(SHELL_URL);
          return cached ?? new Response("Offline", { status: 503 });
        }
      })(),
    );
    return;
  }

  // Static assets: cache-first with background revalidation.
  if (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:css|js|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|gif|ico|webp)$/i.test(url.pathname)
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            if (response && response.status === 200 && response.type === "basic") {
              cache.put(request, response.clone()).catch(() => {});
            }
            return response;
          })
          .catch(() => null);
        return cached ?? (await networkPromise) ?? new Response("Offline asset", { status: 504 });
      })(),
    );
  }
});
