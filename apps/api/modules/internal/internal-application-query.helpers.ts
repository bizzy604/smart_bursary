/**
 * Purpose: Provide reusable normalization helpers for internal AI scoring payload mapping.
 * Why important: Keeps internal query service concise and under file-size guardrails.
 * Used by: InternalApplicationQueryService.
 */
import { Prisma } from '@prisma/client';

export function toRecord(value: Prisma.JsonValue | unknown): Record<string, unknown> {
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}

	return {};
}

export function toText(primary: unknown, fallback?: string | null): string | null {
	if (typeof primary === 'string' && primary.trim().length > 0) {
		return primary.trim();
	}

	if (typeof fallback === 'string' && fallback.trim().length > 0) {
		return fallback.trim();
	}

	return null;
}

export function toBoolean(
	primary: unknown,
	fallback?: boolean | null,
): boolean {
	if (typeof primary === 'boolean') {
		return primary;
	}

	if (typeof primary === 'string') {
		const lowered = primary.trim().toLowerCase();
		if (['1', 'true', 'yes', 'on'].includes(lowered)) {
			return true;
		}
		if (['0', 'false', 'no', 'off'].includes(lowered)) {
			return false;
		}
	}

	return fallback ?? false;
}

export function toNumber(
	primary: unknown,
	fallback?: number | null,
): number {
	if (typeof primary === 'number' && Number.isFinite(primary)) {
		return primary;
	}

	if (typeof primary === 'string') {
		const parsed = Number.parseInt(primary, 10);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}

	if (typeof fallback === 'number' && Number.isFinite(fallback)) {
		return fallback;
	}

	return 0;
}

export function parseYear(value: string | null | undefined): number | null {
	if (!value) {
		return null;
	}

	const match = value.match(/\d{1,4}/);
	if (!match) {
		return null;
	}

	const parsed = Number.parseInt(match[0], 10);
	return Number.isFinite(parsed) ? parsed : null;
}

export function extractYear(fileName: string | null): number | null {
	if (!fileName) {
		return null;
	}

	const match = fileName.match(/(19|20)\d{2}/);
	if (!match) {
		return null;
	}

	const parsed = Number.parseInt(match[0], 10);
	return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeFamilyStatus(value: string): string {
	const normalized = value.trim().toUpperCase();

	if (normalized === 'BOTH_PARENTS_ALIVE' || normalized === 'TWO_PARENTS') {
		return 'BOTH_PARENTS';
	}

	return normalized;
}
