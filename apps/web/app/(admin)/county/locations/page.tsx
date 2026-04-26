"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ApiClientError, apiRequestJson } from "@/lib/api-client";
import { PageHeader } from "@/components/shared/page-header";
import { useSubCounties, useWards, useVillageUnits } from "@/hooks/use-locations";

function errMsg(error: unknown): string {
	if (error instanceof ApiClientError) return `${error.code}: ${error.message}`;
	if (error instanceof Error) return error.message;
	return "Unexpected error.";
}

export default function CountyLocationsPage() {
	const [tab, setTab] = useState<"sc" | "w" | "v">("sc");
	return (
		<main className="space-y-5">
			<PageHeader eyebrow="County administration" title="Manage Geographic Units" description="Create sub-counties, wards, and village units for your county." />
			<div className="flex gap-2">
				<Button variant={tab === "sc" ? "default" : "outline"} onClick={() => setTab("sc")}>Sub-Counties</Button>
				<Button variant={tab === "w" ? "default" : "outline"} onClick={() => setTab("w")}>Wards</Button>
				<Button variant={tab === "v" ? "default" : "outline"} onClick={() => setTab("v")}>Village Units</Button>
			</div>
			{tab === "sc" && <SubCountiesTab />}
			{tab === "w" && <WardsTab />}
			{tab === "v" && <VillagesTab />}
		</main>
	);
}

function SubCountiesTab() {
	const { subCounties, isLoading, reload } = useSubCounties();
	const [name, setName] = useState("");
	const [code, setCode] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const create = async () => {
		if (!name.trim()) { toast.error("Name required"); return; }
		setSubmitting(true);
		try {
			await apiRequestJson("/locations/sub-counties", { method: "POST", body: JSON.stringify({ name: name.trim(), code: code.trim() || undefined }) });
			toast.success("Created"); setName(""); setCode(""); reload();
		} catch (e) { toast.error(errMsg(e)); } finally { setSubmitting(false); }
	};

	return (
		<div className="space-y-4">
			<Card><CardHeader><CardTitle>Add Sub-County</CardTitle></CardHeader>
				<CardContent className="flex gap-3">
					<Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} disabled={submitting} />
					<Input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} disabled={submitting} className="w-32" />
					<Button onClick={create} disabled={submitting || !name.trim()}>Create</Button>
				</CardContent>
			</Card>
			<Card><CardHeader><CardTitle>Existing ({subCounties.length})</CardTitle></CardHeader>
				<CardContent>{isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : subCounties.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> :
					<table className="w-full text-sm"><thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr><th className="px-2 py-1">Name</th><th className="px-2 py-1">Code</th></tr></thead><tbody className="divide-y divide-border">{subCounties.map((s) => <tr key={s.id}><td className="px-2 py-1 font-medium">{s.name}</td><td className="px-2 py-1 text-muted-foreground">{s.code ?? "—"}</td></tr>)}</tbody></table>}</CardContent>
			</Card>
		</div>
	);
}

function WardsTab() {
	const { subCounties } = useSubCounties();
	const { wards, isLoading, reload } = useWards();
	const [name, setName] = useState("");
	const [code, setCode] = useState("");
	const [scId, setScId] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const create = async () => {
		if (!name.trim()) { toast.error("Name required"); return; }
		setSubmitting(true);
		try {
			await apiRequestJson("/locations/wards", { method: "POST", body: JSON.stringify({ name: name.trim(), code: code.trim() || undefined, subCountyId: scId || undefined }) });
			toast.success("Created"); setName(""); setCode(""); setScId(""); reload();
		} catch (e) { toast.error(errMsg(e)); } finally { setSubmitting(false); }
	};

	return (
		<div className="space-y-4">
			<Card><CardHeader><CardTitle>Add Ward</CardTitle></CardHeader>
				<CardContent className="flex gap-3">
					<Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} disabled={submitting} />
					<Input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} disabled={submitting} className="w-32" />
					<select value={scId} onChange={(e) => setScId(e.target.value)} disabled={submitting} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
						<option value="">Sub-county (optional)</option>
						{subCounties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
					</select>
					<Button onClick={create} disabled={submitting || !name.trim()}>Create</Button>
				</CardContent>
			</Card>
			<Card><CardHeader><CardTitle>Existing ({wards.length})</CardTitle></CardHeader>
				<CardContent>{isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : wards.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> :
					<table className="w-full text-sm"><thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr><th className="px-2 py-1">Name</th><th className="px-2 py-1">Code</th></tr></thead><tbody className="divide-y divide-border">{wards.map((w) => <tr key={w.id}><td className="px-2 py-1 font-medium">{w.name}</td><td className="px-2 py-1 text-muted-foreground">{w.code ?? "—"}</td></tr>)}</tbody></table>}</CardContent>
			</Card>
		</div>
	);
}

function VillagesTab() {
	const { wards } = useWards();
	const [name, setName] = useState("");
	const [code, setCode] = useState("");
	const [wardId, setWardId] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const { villages, isLoading, reload } = useVillageUnits(wardId || null);

	const create = async () => {
		if (!name.trim() || !wardId) { toast.error("Name and ward required"); return; }
		setSubmitting(true);
		try {
			await apiRequestJson("/locations/village-units", { method: "POST", body: JSON.stringify({ name: name.trim(), code: code.trim() || undefined, wardId }) });
			toast.success("Created"); setName(""); setCode(""); setWardId(""); reload();
		} catch (e) { toast.error(errMsg(e)); } finally { setSubmitting(false); }
	};

	return (
		<div className="space-y-4">
			<Card><CardHeader><CardTitle>Add Village Unit</CardTitle></CardHeader>
				<CardContent className="flex gap-3">
					<Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} disabled={submitting} />
					<Input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} disabled={submitting} className="w-32" />
					<select value={wardId} onChange={(e) => setWardId(e.target.value)} disabled={submitting} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
						<option value="">Select ward</option>
						{wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
					</select>
					<Button onClick={create} disabled={submitting || !name.trim() || !wardId}>Create</Button>
				</CardContent>
			</Card>
			<Card><CardHeader><CardTitle>Existing ({villages.length})</CardTitle></CardHeader>
				<CardContent>{isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : villages.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> :
					<table className="w-full text-sm"><thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr><th className="px-2 py-1">Name</th><th className="px-2 py-1">Code</th></tr></thead><tbody className="divide-y divide-border">{villages.map((v) => <tr key={v.id}><td className="px-2 py-1 font-medium">{v.name}</td><td className="px-2 py-1 text-muted-foreground">{v.code ?? "—"}</td></tr>)}</tbody></table>}</CardContent>
			</Card>
		</div>
	);
}
