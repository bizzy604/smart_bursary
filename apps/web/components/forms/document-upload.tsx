"use client";

import { Input } from "@/components/ui/input";

export type DocumentType =
	| "id-copy"
	| "school-fee-structure"
	| "admission-letter"
	| "result-slip"
	| "guardian-id-copy";

export interface UploadedDocument {
	type: DocumentType;
	label: string;
	fileName: string;
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
	const setFile = (type: DocumentType, label: string, fileName: string) => {
		const existing = value.find((item) => item.type === type);

		if (existing) {
			onChange(value.map((item) => (item.type === type ? { ...item, fileName } : item)));
			return;
		}

		onChange([...value, { type, label, fileName }]);
	};

	return (
		<div className="space-y-3">
			{requiredDocs.map((doc) => {
				const selected = value.find((item) => item.type === doc.type);
				return (
					<article key={doc.type} className="rounded-xl border border-border bg-background p-3">
						<div className="mb-3 space-y-1">
							<h4 className="font-serif text-sm font-semibold text-primary">{doc.label}</h4>
							<p className="text-xs text-muted-foreground">{doc.hint}</p>
							{selected?.fileName ? <p className="text-xs text-green-700">Selected: {selected.fileName}</p> : null}
						</div>

						<label className="block text-sm text-foreground/90">
							<span className="sr-only">Upload file</span>
							<Input
								type="file"
								onChange={(event) => {
									const file = event.target.files?.[0];
									if (file) {
										setFile(doc.type, doc.label, file.name);
									}
								}}
							/>
						</label>
					</article>
				);
			})}
		</div>
	);
}

