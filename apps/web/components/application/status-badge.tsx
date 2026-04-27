import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/lib/student-types";

const statusStyleMap: Record<ApplicationStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
	DRAFT: "neutral",
	SUBMITTED: "info",
	WARD_REVIEW: "warning",
	WARD_DISTRIBUTION_PENDING: "warning",
	VILLAGE_ALLOCATION_PENDING: "warning",
	ALLOCATED: "info",
	COUNTY_REVIEW: "info",
	APPROVED: "success",
	REJECTED: "danger",
	WAITLISTED: "neutral",
	DISBURSED: "success",
	WITHDRAWN: "neutral",
};

const statusLabelMap: Record<ApplicationStatus, string> = {
	DRAFT: "Draft",
	SUBMITTED: "Submitted",
	WARD_REVIEW: "Ward Review",
	WARD_DISTRIBUTION_PENDING: "Ward Distribution",
	VILLAGE_ALLOCATION_PENDING: "Village Allocation",
	ALLOCATED: "Allocated",
	COUNTY_REVIEW: "County Review",
	APPROVED: "Approved",
	REJECTED: "Rejected",
	WAITLISTED: "Waitlisted",
	DISBURSED: "Disbursed",
	WITHDRAWN: "Withdrawn",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
	return <Badge variant={statusStyleMap[status]}>{statusLabelMap[status]}</Badge>;
}

