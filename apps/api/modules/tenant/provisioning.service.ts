/**
 * Purpose: Reserve tenant provisioning orchestration entry point for later backlog phases.
 * Why important: Keeps provisioning concerns separated from B-03 settings operations.
 * Used by: Future B-04 tenant bootstrap and plan-tier workflows.
 */
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProvisioningService {
	getStatus() {
		return {
			ready: false,
			message: 'Tenant provisioning workflows are scheduled for B-04.',
		};
	}
}
