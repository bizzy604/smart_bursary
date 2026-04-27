"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { uploadDocument } from "@/lib/student-api";
import { useApplicationWizardStore } from "@/store/application-wizard-store";

export type DocumentType =
	| "id-copy"
	| "school-fee-structure"
	| "admission-letter"
	| "result-slip"
	| "guardian-id-copy";

const DOCUMENT_TYPE_API_MAP: Record<DocumentType, string> = {
	"id-copy": "NATIONAL_ID",
	"school-fee-structure": "FEE_STRUCTURE",
	"admission-letter": "ADMISSION_LETTER",
	"result-slip": "RESULT_SLIP",
	"guardian-id-copy": "GUARDIAN_ID_COPY",
};

export interface UploadedDocument {
	type: DocumentType;
	label: string;
	fileName: string;
	documentId?: string;
	downloadUrl?: string;
}

interface DocumentUploadProps {
	value: UploadedDocument[];
	onChange: (next: UploadedDocument[]) => void;
}

const requiredDocs: Array<{ type: DocumentType; label: string; hint: string }> = [
	{
		type: "id-copy",
		label: "National ID / Birth Certificate",
		hint: "Upload a clear copy of your identification document.",
	},
	{
		type: "school-fee-structure",
		label: "School Fee Structure",
		hint: "Latest fee structure signed by your institution.",
	},
	{
		type: "admission-letter",
		label: "Admission Letter",
		hint: "Required for first-year applicants.",
	},
	{
		type: "result-slip",
		label: "Result Slip / Report Form",
		hint: "Most recent academic performance document.",
	},
	{
		type: "guardian-id-copy",
		label: "Guardian ID Copy",
		hint: "If your guardian is not your parent.",
	},
];

export function DocumentUpload({ value, onChange }: DocumentUploadProps) {
	const [uploading, setUploading] = useState<Set<DocumentType>>(new Set());
	const programs = useApplicationWizardStore((state) => state.programs);
	const params = useParams<{ programId: string }>();
	
	const programId = params.programId;
	const programState = programId ? programs[programId] : null;
	const existingApplicationId = programState?.applicationId;

	const handleFileUpload = async (type: DocumentType, label: string, file: File) => {
		if (!existingApplicationId) {
			alert("Please save your application first before uploading documents.");
			return;
		}

		setUploading((prev) => new Set(prev).add(type));

		try {
			const result = await uploadDocument(existingApplicationId, DOCUMENT_TYPE_API_MAP[type], file);
			
			const existing = value.find((item) => item.type === type);

			if (existing) {
				onChange(value.map((item) => 
					item.type === type 
						? { ...item, fileName: file.name, documentId: result.id, downloadUrl: result.downloadUrl }
						: item
				));
			} else {
				onChange([...value, { type, label, fileName: file.name, documentId: result.id, downloadUrl: result.downloadUrl }]);
			}
		} catch (error) {
			console.error("Failed to upload document:", error);
			alert("Failed to upload document. Please try again.");
		} finally {
			setUploading((prev) => {
				const next = new Set(prev);
				next.delete(type);
				return next;
			});
		}
	};

	return (
		<div className="space-y-3">
			{requiredDocs.map((doc) => {
				const selected = value.find((item) => item.type === doc.type);
				const isUploading = uploading.has(doc.type);
				return (
					<article key={doc.type} className="rounded-xl border border-border bg-background p-3">
						<div className="mb-3 space-y-1">
							<h4 className="font-serif text-sm font-semibold text-primary">{doc.label}</h4>
							<p className="text-xs text-muted-foreground">{doc.hint}</p>
							{selected?.fileName ? (
								<p className="text-xs text-green-700">
									{selected.documentId ? "Uploaded: " : "Selected: "}{selected.fileName}
								</p>
							) : null}
						</div>

						<label className="block text-sm text-foreground/90">
							<span className="sr-only">Upload file</span>
							<Input
								type="file"
								disabled={isUploading}
								onChange={(event) => {
									const file = event.target.files?.[0];
									if (file) {
										void handleFileUpload(doc.type, doc.label, file);
									}
								}}
							/>
							{isUploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
						</label>
					</article>
				);
			})}
		</div>
	);
}

