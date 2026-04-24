/**
 * Zero-dependency module-level token store.
 * Keeps the access token in JS heap memory only — never written to localStorage or cookies.
 * Lost on page refresh; the api-client auto-refreshes from the httpOnly cookie on any 401.
 */
let _token: string | null = null;

export const tokenStore = {
	get: (): string | null => _token,
	set: (t: string): void => { _token = t; },
	clear: (): void => { _token = null; },
};
