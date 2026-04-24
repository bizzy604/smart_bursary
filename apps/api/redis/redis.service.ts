/**
 * Purpose: Provide a shared Redis client for auth session state and ephemeral tokens.
 * Why important: Auth refresh tokens, OTPs, and revocation state need a durable shared store.
 * Used by: Auth hardening flows and any future Redis-backed app services.
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

type RedisLike = {
	set: (key: string, value: string, ...args: Array<string | number>) => Promise<unknown>;
	get: (key: string) => Promise<string | null>;
	getdel: (key: string) => Promise<string | null>;
	del: (key: string) => Promise<number>;
	quit: () => Promise<unknown>;
};

type MemoryEntry = { value: string; expiresAt: number | null };

@Injectable()
export class RedisService implements OnModuleDestroy {
	private readonly logger = new Logger(RedisService.name);
	private readonly client: RedisLike;
	private readonly memoryStore = new Map<string, MemoryEntry>();
	private readonly isMemoryBacked: boolean;

	constructor() {
		const redisUrl = process.env.REDIS_URL;
		this.isMemoryBacked = !redisUrl;

		if (redisUrl) {
			const client = new Redis(redisUrl, {
				maxRetriesPerRequest: null,
				enableReadyCheck: false,
			});
			client.on('error', (error) => this.logger.warn(`Redis client error: ${error.message}`));
			this.client = client as unknown as RedisLike;
			return;
		}

		this.client = {
			set: async (key: string, value: string, ...args: Array<string | number>) => {
				const ttlIndex = args.findIndex((arg) => arg === 'EX');
				const ttlSeconds = ttlIndex >= 0 ? Number(args[ttlIndex + 1]) : null;
				this.memoryStore.set(key, {
					value,
					expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
				});
			},
			get: async (key: string) => {
				const entry = this.memoryStore.get(key);
				if (!entry) {
					return null;
				}

				if (entry.expiresAt && entry.expiresAt < Date.now()) {
					this.memoryStore.delete(key);
					return null;
				}

				return entry.value;
			},
			getdel: async (key: string) => {
				const entry = this.memoryStore.get(key);
				if (!entry) {
					return null;
				}

				if (entry.expiresAt && entry.expiresAt < Date.now()) {
					this.memoryStore.delete(key);
					return null;
				}

				this.memoryStore.delete(key);
				return entry.value;
			},
			del: async (key: string) => Number(this.memoryStore.delete(key)),
			quit: async () => undefined,
		};
	}

	getClient(): RedisLike {
		return this.client;
	}

	async onModuleDestroy(): Promise<void> {
		if (!this.isMemoryBacked) {
			await this.client.quit();
			this.logger.log('Redis client closed');
		}
	}
}
