/**
 * Purpose: Drain the offline outbox when connectivity returns by replaying
 *          each queued request against the API with its original idempotency
 *          key. Matches the `applications.client_idempotency_key` unique
 *          index introduced in Commit 1 of the data-integrity rollout.
 * Why important: Without an idempotent replay path, a flaky mobile network
 *                produces duplicate submissions. The backend dedupe is the
 *                last line of defence; this engine ensures correct retries.
 * Used by: components/providers/pwa-provider.tsx.
 */

"use client";

import { apiRequestJson } from "@/lib/api-client";
import { outbox, type OutboxEntry } from "@/lib/offline/idb-outbox";
import { subscribeOnlineChanges } from "@/lib/offline/network-state";

const MAX_ATTEMPTS_BEFORE_FAIL = 5;

let inFlight = false;

/** Drain the outbox once, in FIFO order. Caller may invoke repeatedly. */
export async function drainOutboxOnce(): Promise<{
	processed: number;
	succeeded: number;
	failed: number;
	deferred: number;
}> {
	if (inFlight) {
		return { processed: 0, succeeded: 0, failed: 0, deferred: 0 };
	}
	inFlight = true;

	let processed = 0;
	let succeeded = 0;
	let failed = 0;
	let deferred = 0;

	try {
		const pending = await outbox.listOldestFirst(50);
		for (const entry of pending) {
			processed += 1;
			try {
				await replay(entry);
				await outbox.remove(entry.idempotencyKey);
				succeeded += 1;
			} catch (error) {
				const result = classify(error);
				if (result.kind === "permanent") {
					await outbox.moveToFailed(
						entry.idempotencyKey,
						result.statusCode ?? 0,
						result.body,
					);
					failed += 1;
				} else if (entry.attempts + 1 >= MAX_ATTEMPTS_BEFORE_FAIL) {
					await outbox.moveToFailed(
						entry.idempotencyKey,
						result.statusCode ?? 0,
						result.body ?? { error: String(error) },
					);
					failed += 1;
				} else {
					await outbox.incrementAttempt(entry.idempotencyKey, String(error));
					deferred += 1;
				}
			}
		}
	} finally {
		inFlight = false;
	}

	return { processed, succeeded, failed, deferred };
}

async function replay(entry: OutboxEntry): Promise<unknown> {
	// Inject the idempotency key into both the body and a header so the
	// backend can dedupe regardless of which it inspects first.
	const body =
		entry.request.body && typeof entry.request.body === "object"
			? { ...(entry.request.body as Record<string, unknown>), clientIdempotencyKey: entry.idempotencyKey }
			: entry.request.body;

	return apiRequestJson(entry.request.url, {
		method: entry.request.method,
		body: JSON.stringify(body),
		headers: {
			"Content-Type": "application/json",
			"X-Idempotency-Key": entry.idempotencyKey,
			...(entry.request.headers ?? {}),
		},
	});
}

interface ClassifiedError {
	kind: "permanent" | "transient";
	statusCode?: number;
	body?: unknown;
}

function classify(error: unknown): ClassifiedError {
	// ApiClientError carries the http status code; we treat 4xx as permanent
	// (no amount of retry helps), 5xx and network errors as transient.
	const status = (error as { status?: number; statusCode?: number })?.status
		?? (error as { statusCode?: number })?.statusCode;
	if (typeof status === "number") {
		if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
			return { kind: "permanent", statusCode: status };
		}
		return { kind: "transient", statusCode: status };
	}
	return { kind: "transient" };
}

/**
 * Wires the engine to the browser's online/offline events. Returns an
 * unsubscribe function that the provider can call on unmount.
 */
export function startSyncEngine(): () => void {
	if (typeof window === "undefined") return () => {};

	// Drain immediately on startup if we're already online — a previous
	// session may have left entries behind.
	if (navigator.onLine) {
		void drainOutboxOnce();
	}

	const unsubscribe = subscribeOnlineChanges((online) => {
		if (online) {
			void drainOutboxOnce();
		}
	});

	return unsubscribe;
}
