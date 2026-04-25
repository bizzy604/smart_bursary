import { API_BASE_URL } from "@/lib/constants";
import { tokenStore } from "@/lib/token-store";

export interface ApiError {
	code: string;
	message: string;
	details?: Array<{ field?: string; message: string }>;
}

interface ApiErrorEnvelope {
	error: ApiError;
}

interface ApiSuccessEnvelope<TData> {
	data: TData;
}

export class ApiClientError extends Error {
	code: string;
	status: number;
	details?: Array<{ field?: string; message: string }>;

	constructor(status: number, error: ApiError) {
		super(error.message);
		this.name = "ApiClientError";
		this.status = status;
		this.code = error.code;
		this.details = error.details;
	}
}

function resolveUrl(path: string): string {
	if (path.startsWith("http://") || path.startsWith("https://")) {
		return path;
	}

	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${API_BASE_URL}${normalizedPath}`;
}

function buildHeaders(init: RequestInit, token: string | null): Record<string, string> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(init.headers as Record<string, string> ?? {}),
	};
	if (token) {
		headers["Authorization"] = `Bearer ${token}`;
	}
	return headers;
}

async function readJsonBody<T>(response: Response): Promise<T | null> {
	if (response.status === 204) {
		return null;
	}

	const text = await response.text();
	if (!text) {
		return null;
	}

	try {
		return JSON.parse(text) as T;
	} catch {
		return null;
	}
}

// Read the access token from the in-memory store. The token is populated by
// `components/providers/session-provider.tsx` whenever the NextAuth session
// loads or refreshes. If it isn't present (e.g. the page was opened in a tab
// before the provider mounted), we wait briefly for it to appear before giving
// up.
async function waitForToken(): Promise<string | null> {
	const immediate = tokenStore.get();
	if (immediate) {
		return immediate;
	}
	for (let i = 0; i < 5; i++) {
		await new Promise((resolve) => setTimeout(resolve, 50));
		const token = tokenStore.get();
		if (token) {
			return token;
		}
	}
	return null;
}

function parseEnvelope<TData>(body: unknown): ApiSuccessEnvelope<TData> {
	if (body && typeof body === "object" && "data" in (body as object)) {
		return body as ApiSuccessEnvelope<TData>;
	}
	return { data: body as TData };
}

async function fetchWithAuth(path: string, init: RequestInit = {}): Promise<Response> {
	const authPath = path.startsWith("/auth/");
	const token = authPath ? null : await waitForToken();

	return fetch(resolveUrl(path), {
		...init,
		headers: buildHeaders(init, token),
		cache: "no-store",
	});
}

async function handleUnauthenticated(): Promise<void> {
	tokenStore.clear();
	if (typeof window !== "undefined") {
		try {
			const { signOut } = await import("next-auth/react");
			await signOut({ redirect: true, callbackUrl: "/login?reason=expired" });
		} catch {
			window.location.assign("/login?reason=expired");
		}
	}
}

export async function apiRequest(path: string, init: RequestInit = {}): Promise<Response> {
	const response = await fetchWithAuth(path, init);

	if (response.status === 401 && !path.startsWith("/auth/")) {
		await handleUnauthenticated();
		// signOut() above kicked off a navigation to /login, but we still need
		// to short-circuit the rest of this request so callers don't see a
		// generic ApiClientError or try to render error UI on components that
		// are about to unmount.
		throw new ApiClientError(response.status, {
			code: "UNAUTHENTICATED",
			message: "Session expired. Please sign in again.",
		});
	}

	if (!response.ok) {
		const payload = await readJsonBody<ApiErrorEnvelope>(response);
		const fallbackError: ApiError = {
			code: "UNKNOWN_ERROR",
			message: "An unexpected error occurred.",
		};
		throw new ApiClientError(response.status, payload?.error ?? fallbackError);
	}

	return response;
}

export async function apiRequestJson<TData>(
	path: string,
	init: RequestInit = {},
): Promise<TData> {
	const response = await apiRequest(path, init);
	return (await readJsonBody<TData>(response)) as TData;
}

export async function apiRequestBlob(
	path: string,
	init: RequestInit = {},
): Promise<Blob> {
	const response = await apiRequest(path, init);
	return response.blob();
}

export async function apiFetch<TData>(
	path: string,
	init: RequestInit = {},
): Promise<ApiSuccessEnvelope<TData>> {
	const response = await apiRequest(path, init);
	return parseEnvelope<TData>(await readJsonBody<unknown>(response));
}
