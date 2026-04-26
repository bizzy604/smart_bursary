/**
 * Purpose: Typed wrapper over IndexedDB exposing the offline submission outbox.
 * Why important: Lets the rest of the app enqueue/drain offline requests without
 *                touching the IDB API directly. Backed by the browser's native
 *                IndexedDB to avoid a dependency on `idb` at this scaffold stage.
 * Used by: lib/offline/sync-engine.ts and any submission helper that wants to
 *          fall back to the outbox when fetch() fails.
 *
 * Architecture note: see lib/offline/README.md for the full flow.
 */

const DB_NAME = "smart-bursary-offline";
const DB_VERSION = 1;
const STORE_OUTBOX = "outbox";
const STORE_FAILED = "failed";

export interface OutboxEntry {
	/** Client-generated UUID v4. Sent to the backend as `clientIdempotencyKey`. */
	idempotencyKey: string;
	/** Logical name of the operation (e.g., "submitApplication"). For UX/debug. */
	operation: string;
	/** Original request envelope. URL is API-relative, e.g., "/applications". */
	request: {
		method: "POST" | "PUT" | "PATCH" | "DELETE";
		url: string;
		body: unknown;
		headers?: Record<string, string>;
	};
	/** Wall-clock timestamp the entry was enqueued (ms since epoch). */
	enqueuedAt: number;
	/** How many times we've attempted to drain this entry. */
	attempts: number;
	/** Last error message if any. */
	lastError?: string;
}

export interface FailedOutboxEntry extends OutboxEntry {
	failedAt: number;
	finalStatusCode: number;
	finalErrorBody?: unknown;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function isBrowser(): boolean {
	return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
	if (!isBrowser()) {
		return Promise.reject(new Error("IndexedDB is only available in the browser."));
	}
	if (!dbPromise) {
		dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
			const req = indexedDB.open(DB_NAME, DB_VERSION);
			req.onupgradeneeded = () => {
				const db = req.result;
				if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
					const store = db.createObjectStore(STORE_OUTBOX, { keyPath: "idempotencyKey" });
					store.createIndex("by_enqueuedAt", "enqueuedAt", { unique: false });
				}
				if (!db.objectStoreNames.contains(STORE_FAILED)) {
					db.createObjectStore(STORE_FAILED, { keyPath: "idempotencyKey" });
				}
			};
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error ?? new Error("Failed to open IndexedDB."));
			req.onblocked = () => reject(new Error("IndexedDB open blocked."));
		});
	}
	return dbPromise;
}

// IDBRequest is generic over its result type; the IDB lib defs make returning
// a heterogeneous request from `work(store)` awkward. We accept any IDBRequest
// or Promise here and cast on resolve — call sites narrow with their own
// type parameter on the outer `txPromise` invocation.
type AnyIDBRequest = IDBRequest<unknown> | IDBRequest<undefined> | IDBRequest<IDBValidKey>;

function txPromise<T>(
	storeName: string,
	mode: IDBTransactionMode,
	work: (store: IDBObjectStore) => AnyIDBRequest | Promise<T>,
): Promise<T> {
	return openDb().then(
		(db) =>
			new Promise<T>((resolve, reject) => {
				const tx = db.transaction(storeName, mode);
				const store = tx.objectStore(storeName);
				const result = work(store);
				if (result instanceof IDBRequest) {
					result.onsuccess = () => resolve(result.result as T);
					result.onerror = () => reject(result.error);
				} else {
					Promise.resolve(result).then(resolve, reject);
				}
				tx.onerror = () => reject(tx.error);
				tx.onabort = () => reject(tx.error ?? new Error("IDB transaction aborted."));
			}),
	);
}

export const outbox = {
	async enqueue(entry: Omit<OutboxEntry, "enqueuedAt" | "attempts">): Promise<void> {
		if (!isBrowser()) return;
		const full: OutboxEntry = {
			...entry,
			enqueuedAt: Date.now(),
			attempts: 0,
		};
		await txPromise<unknown>(STORE_OUTBOX, "readwrite", (store) => store.put(full));
	},

	async listOldestFirst(limit = 50): Promise<OutboxEntry[]> {
		if (!isBrowser()) return [];
		return txPromise<OutboxEntry[]>(STORE_OUTBOX, "readonly", (store) => {
			return new Promise<OutboxEntry[]>((resolve, reject) => {
				const idx = store.index("by_enqueuedAt");
				const cur = idx.openCursor();
				const out: OutboxEntry[] = [];
				cur.onsuccess = () => {
					const cursor = cur.result;
					if (cursor && out.length < limit) {
						out.push(cursor.value as OutboxEntry);
						cursor.continue();
					} else {
						resolve(out);
					}
				};
				cur.onerror = () => reject(cur.error);
			});
		});
	},

	async remove(idempotencyKey: string): Promise<void> {
		if (!isBrowser()) return;
		await txPromise<unknown>(STORE_OUTBOX, "readwrite", (store) =>
			store.delete(idempotencyKey),
		);
	},

	async incrementAttempt(idempotencyKey: string, error: string): Promise<void> {
		if (!isBrowser()) return;
		await txPromise<unknown>(STORE_OUTBOX, "readwrite", async (store) => {
			return new Promise<void>((resolve, reject) => {
				const get = store.get(idempotencyKey);
				get.onsuccess = () => {
					const entry = get.result as OutboxEntry | undefined;
					if (!entry) {
						resolve();
						return;
					}
					const updated: OutboxEntry = {
						...entry,
						attempts: entry.attempts + 1,
						lastError: error,
					};
					const put = store.put(updated);
					put.onsuccess = () => resolve();
					put.onerror = () => reject(put.error);
				};
				get.onerror = () => reject(get.error);
			});
		});
	},

	async moveToFailed(
		idempotencyKey: string,
		statusCode: number,
		errorBody?: unknown,
	): Promise<void> {
		if (!isBrowser()) return;
		const db = await openDb();
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction([STORE_OUTBOX, STORE_FAILED], "readwrite");
			const outboxStore = tx.objectStore(STORE_OUTBOX);
			const failedStore = tx.objectStore(STORE_FAILED);
			const get = outboxStore.get(idempotencyKey);
			get.onsuccess = () => {
				const entry = get.result as OutboxEntry | undefined;
				if (!entry) {
					tx.oncomplete = () => resolve();
					return;
				}
				const failed: FailedOutboxEntry = {
					...entry,
					failedAt: Date.now(),
					finalStatusCode: statusCode,
					finalErrorBody: errorBody,
				};
				failedStore.put(failed);
				outboxStore.delete(idempotencyKey);
			};
			get.onerror = () => reject(get.error);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
		});
	},

	async listFailed(): Promise<FailedOutboxEntry[]> {
		if (!isBrowser()) return [];
		return txPromise<FailedOutboxEntry[]>(STORE_FAILED, "readonly", (store) => {
			return new Promise<FailedOutboxEntry[]>((resolve, reject) => {
				const req = store.getAll();
				req.onsuccess = () => resolve((req.result ?? []) as FailedOutboxEntry[]);
				req.onerror = () => reject(req.error);
			});
		});
	},
};

/** Generates a UUID v4 for the idempotency key. Falls back if `crypto.randomUUID` is unavailable. */
export function newIdempotencyKey(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	// RFC4122 v4 fallback for older browsers / non-secure contexts.
	const random = (bytes: number): string =>
		Array.from({ length: bytes }, () => Math.floor(Math.random() * 256))
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
	return `${random(4)}-${random(2)}-${random(2)}-${random(2)}-${random(6)}`;
}
