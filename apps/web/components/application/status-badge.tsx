import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/lib/student-data";

const statusStyleMap: Record<ApplicationStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
	DRAFT: "neutral",
	SUBMITTED: "info",
	WARD_REVIEW: "warning",
	COUNTY_REVIEW: "info",
	APPROVED: "success",
	REJECTED: "danger",
	WAITLISTED: "neutral",
	DISBURSED: "success",
};

const statusLabelMap: Record<ApplicationStatus, string> = {
	DRAFT: "Draft",
	SUBMITTED: "Submitted",
	WARD_REVIEW: "Ward Review",
	COUNTY_REVIEW: "County Review",
	APPROVED: "Approved",
	REJECTED: "Rejected",
	WAITLISTED: "Waitlisted",
	DISBURSED: "Disbursed",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
	return <Badge variant={statusStyleMap[status]}>{statusLabelMap[status]}</Badge>;
}

