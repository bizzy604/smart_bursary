/**
 * Purpose: Queue disbursement execution jobs with retry backoff handling.
 * Why important: Ensures failed payouts are retried up to policy limits before escalation.
 * Used by: DisbursementService when initiating and manually retrying payouts.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

import {
	DisbursementExecutionResult,
	DisbursementExecutionService,
} from './disbursement-execution.service';

type DisbursementJobData = {
	disbursementId: string;
};

type DisbursementQueueAdapter = {
	add: (name: string, data: DisbursementJobData, delayMs?: number) => Promise<void>;
};

@Injectable()
export class DisbursementQueueService implements OnModuleDestroy {
	private readonly logger = new Logger(DisbursementQueueService.name);
	private readonly disbursementQueue: DisbursementQueueAdapter;
	private readonly redisConnection?: Redis;
	private readonly worker?: Worker<DisbursementJobData>;

	constructor(private readonly executionService: DisbursementExecutionService) {
		const redisUrl = process.env.REDIS_URL;
		if (!redisUrl) {
			this.disbursementQueue = {
				add: async (_name, data) => {
					await this.process(data.disbursementId);
				},
			};
			this.logger.log('Disbursement queue configured for in-process fallback');
			return;
		}

		this.redisConnection = new Redis(redisUrl, {
			maxRetriesPerRequest: null,
			enableReadyCheck: false,
		});
		const queue = new Queue<DisbursementJobData>('disbursement-execution', {
			connection: this.redisConnection,
		});
		this.worker = new Worker<DisbursementJobData>(
			'disbursement-execution',
			async (job) => {
				await this.process(job.data.disbursementId);
			},
			{ connection: this.redisConnection },
		);

		this.disbursementQueue = {
			add: async (name, data, delayMs = 0) => {
				await queue.add(name, data, {
					delay: delayMs,
					jobId: `${data.disbursementId}-${Date.now()}`,
				});
			},
		};
		this.logger.log('Disbursement queue configured for Redis transport');
	}

	async onModuleDestroy(): Promise<void> {
		await this.worker?.close();
		await this.redisConnection?.quit();
	}

	async enqueue(disbursementId: string, delayMs = 0): Promise<void> {
		await this.disbursementQueue.add(
			'execute-disbursement',
			{ disbursementId },
			delayMs,
		);
	}

	private async process(disbursementId: string): Promise<void> {
		const result = await this.executionService.execute(disbursementId);
		if (result.status === 'FAILED_RETRY') {
			const delayMs = this.resolveBackoffDelayMs(result);
			await this.enqueue(disbursementId, delayMs);
			return;
		}

		if (result.status === 'FAILED_TERMINAL') {
			this.logger.warn(
				`Disbursement ${disbursementId} reached terminal failure after ${result.retryCount} attempts.`,
			);
		}
	}

	private resolveBackoffDelayMs(result: DisbursementExecutionResult): number {
		const baseDelayMs = Number.parseInt(process.env.DISBURSEMENT_RETRY_BASE_DELAY_MS ?? '1000', 10);
		const safeBaseDelayMs = Number.isFinite(baseDelayMs) && baseDelayMs > 0 ? baseDelayMs : 1000;
		return safeBaseDelayMs * Math.max(1, result.retryCount);
	}
}
