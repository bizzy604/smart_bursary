import { API_BASE_URL } from "@/lib/constants";

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

export async function apiFetch<TData>(
	path: string,
	init: RequestInit = {},
): Promise<ApiSuccessEnvelope<TData>> {
	const response = await fetch(resolveUrl(path), {
		...init,
		headers: {
			"Content-Type": "application/json",
			...(init.headers ?? {}),
		},
		credentials: "include",
		cache: "no-store",
	});

	if (!response.ok) {
		const payload = (await response.json().catch(() => null)) as ApiErrorEnvelope | null;
		const fallbackError: ApiError = {
			code: "UNKNOWN_ERROR",
			message: "An unexpected error occurred.",
		};
		throw new ApiClientError(response.status, payload?.error ?? fallbackError);
	}

	return (await response.json()) as ApiSuccessEnvelope<TData>;
}

