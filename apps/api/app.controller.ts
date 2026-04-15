/**
 * Purpose: Expose process-level health endpoint for runtime checks.
 * Why important: Enables readiness/liveness checks during local and deployed execution.
 * Used by: Integration tests, platform health checks, and orchestrators.
 */
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class AppController {
	@Get()
	getHealth(): { status: string; service: string; timestamp: string } {
		return {
			status: 'ok',
			service: 'api',
			timestamp: new Date().toISOString(),
		};
	}
}
