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

// Silently refreshes the access token from the httpOnly refresh cookie.
// Returns the new token on success, null on failure (session expired).
async function silentRefresh(): Promise<string | null> {
	try {
		const response = await fetch(resolveUrl("/auth/refresh"), {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			cache: "no-store",
		});
		if (!response.ok) return null;
		const body = (await response.json()) as Record<string, unknown>;
		const raw = (body?.data ?? body) as Record<string, unknown>;
		const newToken = typeof raw.accessToken === "string" ? raw.accessToken : null;
		if (newToken) tokenStore.set(newToken);
		return newToken;
	} catch {
		return null;
	}
}

function parseEnvelope<TData>(body: unknown): ApiSuccessEnvelope<TData> {
	if (body && typeof body === "object" && "data" in (body as object)) {
		return body as ApiSuccessEnvelope<TData>;
	}
	return { data: body as TData };
}

export async function apiFetch<TData>(
	path: string,
	init: RequestInit = {},
): Promise<ApiSuccessEnvelope<TData>> {
	const token = tokenStore.get();
	const headers = buildHeaders(init, token);

	const response = await fetch(resolveUrl(path), {
		...init,
		headers,
		credentials: "include",
		cache: "no-store",
	});

	// On 401, attempt a silent token refresh from the httpOnly cookie, then retry once.
	if (response.status === 401 && !path.includes("/auth/refresh")) {
		const newToken = await silentRefresh();
		if (newToken) {
			const retryResponse = await fetch(resolveUrl(path), {
				...init,
				headers: buildHeaders(init, newToken),
				credentials: "include",
				cache: "no-store",
			});
			if (retryResponse.ok) {
				return parseEnvelope<TData>(await retryResponse.json());
			}
		}
	}

	if (!response.ok) {
		const payload = (await response.json().catch(() => null)) as ApiErrorEnvelope | null;
		const fallbackError: ApiError = {
			code: "UNKNOWN_ERROR",
			message: "An unexpected error occurred.",
		};
		throw new ApiClientError(response.status, payload?.error ?? fallbackError);
	}

	return parseEnvelope<TData>(await response.json());
}
