/**
 * Purpose: Types for the cross-county active-cycle identity registry (§5.3 L2).
 * Why important: Centralises the IdentityKind discriminator and the claim/release
 *                request/response shapes shared between IdentityRegistryService and
 *                its (future) callers in the application submission and withdrawal flows.
 * Used by: IdentityRegistryService, identity-registry.e2e-spec.ts.
 */

/** Which identity field is being indexed. Priority order matches §5.3 L2. */
export enum IdentityKind {
	NATIONAL_ID = 'NATIONAL_ID',
	BIRTH_CERTIFICATE = 'BIRTH_CERTIFICATE',
	NEMIS_UPI = 'NEMIS_UPI',
}

/** Input to IdentityRegistryService.claim — the raw identity value, the cycle, and provenance. */
export type IdentityClaimRequest = {
	/** Raw identity value (e.g. "12345678" national_id). NEVER stored — only hashed. */
	rawIdentity: string;
	kind: IdentityKind;
	/** academic_year string (e.g. "2024/2025") that defines the active cycle. */
	cycle: string;
	/** Application taking the slot. */
	applicationId: string;
	countyId: string;
};

/** Result of a successful claim. */
export type IdentityClaimResult = {
	identityHashHex: string;
	activeApplicationId: string;
	activeCountyId: string;
	activeCycle: string;
	firstRegisteredCountyId: string;
	firstRegisteredAt: Date;
};

/**
 * Result of a conflicting claim (i.e., another county already holds an active slot
 * for this identity in the same cycle). The caller should reject the submission
 * with a structured error referencing the existing county.
 */
export type IdentityClaimConflict = {
	identityHashHex: string;
	conflictingCountyId: string;
	conflictingApplicationId: string | null;
	conflictingCycle: string;
};

export type IdentityClaimOutcome =
	| { kind: 'CLAIMED'; result: IdentityClaimResult }
	| { kind: 'ALREADY_OWNED'; result: IdentityClaimResult }
	| { kind: 'CONFLICT'; conflict: IdentityClaimConflict };
