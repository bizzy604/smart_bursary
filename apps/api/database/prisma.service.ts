/**
 * Purpose: Manage Prisma connection lifecycle and tenant-scoped query execution.
 * Why important: Provides a single safe path for DB access and county isolation context.
 * Used by: Application services and repository/query classes.
 */
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';

type TenantContext = {
	countyId: string;
	userId: string;
	role: string;
	wardId?: string | null;
};

@Injectable()
export class PrismaService
	extends PrismaClient
	implements OnModuleInit, OnModuleDestroy
{
	constructor(private readonly configService: ConfigService) {
		super({
			datasourceUrl: configService.get<string>('database.url'),
			log: ['error', 'warn'],
		});
	}

	async onModuleInit(): Promise<void> {
		await this.$connect();
	}

	async onModuleDestroy(): Promise<void> {
		await this.$disconnect();
	}

	async withTenantContext<T>(
		ctx: TenantContext,
		work: (tx: Prisma.TransactionClient) => Promise<T>,
	): Promise<T> {
		return this.$transaction(async (tx: Prisma.TransactionClient) => {
			await tx.$executeRaw`
				SELECT set_config('app.current_county_id', ${ctx.countyId}, true)
			`;
			await tx.$executeRaw`
				SELECT set_config('app.current_user_id', ${ctx.userId}, true)
			`;
			await tx.$executeRaw`
				SELECT set_config('app.current_role', ${ctx.role}, true)
			`;
			await tx.$executeRaw`
				SELECT set_config('app.current_ward_id', ${ctx.wardId ?? ''}, true)
			`;

			return work(tx);
		});
	}
}
