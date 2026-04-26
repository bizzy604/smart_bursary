/**
 * Purpose: Shared enums and types for the allocation override hierarchy and audit trail.
 * Why important: Centralizes the override reason vocabulary used across DTO validation,
 *               service-layer enforcement, and the timeline metadata schema.
 * Used by: AllocateToStudentDto, StudentAllocationService, AllocationAvailabilityService,
 *          and integration tests asserting audit-trail content.
 */

/**
 * Reason codes for an allocation override. Per §7.4 of
 * Docs/12-DATA-INTEGRITY-AND-OFFLINE-DESIGN.md, an override is only permitted
 * when the village admin is structurally unavailable. The reason MUST match
 * the system's view of availability or the request is rejected.
 */
export enum OverrideReasonCode {
	/** No active VILLAGE_ADMIN assignment exists for the village_unit. */
	VILLAGE_ADMIN_VACANT = 'VILLAGE_ADMIN_VACANT',
	/** A village admin exists but is_active = false (e.g., on leave / suspended). */
	VILLAGE_ADMIN_INACTIVE = 'VILLAGE_ADMIN_INACTIVE',
	/** The village_allocation_due_at deadline has passed without action. */
	VILLAGE_DEADLINE_MISSED = 'VILLAGE_DEADLINE_MISSED',
	/** County admin marked the village admin as temporarily_unavailable. */
	EXPLICITLY_DELEGATED = 'EXPLICITLY_DELEGATED',
}

/**
 * Snapshot of the availability detector's view of a village_unit. Used by
 * StudentAllocationService.allocate to decide whether an override is permitted
 * and recorded verbatim in the audit timeline metadata.
 */
export type VillageAdminAvailability = {
	/** True if a village admin exists, is_active = true, and (if set) the unavailable_until is in the past. */
	isAvailable: boolean;
	/** The current active village admin user id, or null if none exists. */
	activeAdminId: string | null;
	/** A structured reason when isAvailable = false. Always undefined when isAvailable = true. */
	unavailableReason?: OverrideReasonCode;
	/** Free-text context attached to the unavailable status (e.g., "On medical leave"). */
	unavailableContext?: string | null;
	/** The village allocation deadline, if any, used to flag VILLAGE_DEADLINE_MISSED. */
	allocationDueAt?: Date | null;
};
