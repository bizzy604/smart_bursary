/**
 * Purpose: Provide a deterministic national ward seed snapshot for tenant bootstrap.
 * Why important: Enables provisioning to initialize ward-level records without external IO.
 * Used by: ProvisioningService default ward seeding path.
 */
export const NATIONAL_WARD_SEED_SIZE = 1450;

export type WardSeedRecord = {
	code: string;
	name: string;
	subCounty?: string;
};

export function buildNationalWardSeed(): WardSeedRecord[] {
	const wards: WardSeedRecord[] = [];
	for (let index = 1; index <= NATIONAL_WARD_SEED_SIZE; index += 1) {
		wards.push({
			code: `NWR-${index.toString().padStart(4, '0')}`,
			name: `National Ward ${index}`,
		});
	}

	return wards;
}
