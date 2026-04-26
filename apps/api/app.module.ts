/**
 * Purpose: Compose application-level modules and global providers.
 * Why important: Centralizes runtime wiring for config, persistence, and global filters.
 * Used by: NestJS bootstrap in main.ts.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { JwtRequestContextGuard } from './common/guards/jwt-request-context.guard';
import { PlanTierGuard } from './common/guards/plan-tier.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RequestObservabilityInterceptor } from './common/interceptors/request-observability.interceptor';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';
import configuration from './config/configuration';
import databaseConfig from './config/database.config';
import validationSchema from './config/validation';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { AllocationModule } from './modules/allocation/allocation.module';
import { ApplicationModule } from './modules/application/application.module';
import { IdentityModule } from './modules/identity/identity.module';
import { ProgramModule } from './modules/program/program.module';
import { ProfileModule } from './modules/profile/profile.module';
import { DocumentModule } from './modules/document/document.module';
import { ReviewModule } from './modules/review/review.module';
import { AiModule } from './modules/ai/ai.module';
import { InternalModule } from './modules/internal/internal.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { NotificationModule } from './modules/notification/notification.module';
import { DisbursementModule } from './modules/disbursement/disbursement.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { UserModule } from './modules/user/user.module';
import { UssdModule } from './modules/ussd/ussd.module';
import { QueueModule } from './queue/queue.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			cache: true,
			load: [configuration, databaseConfig],
			validationSchema,
		}),
		// Global default: 60 requests per minute. Auth endpoints apply stricter limits via @Throttle.
		ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
		DatabaseModule,
		RedisModule,
		QueueModule,
		AuthModule,
		AllocationModule,
		IdentityModule,
		ApplicationModule,
		ProgramModule,
		ProfileModule,
		DocumentModule,
		ReviewModule,
		AiModule,
		InternalModule,
		TenantModule,
		NotificationModule,
		DisbursementModule,
		ReportingModule,
		UserModule,
		UssdModule,
	],
	controllers: [AppController],
	providers: [
		{ provide: APP_FILTER, useClass: PrismaExceptionFilter },
		{ provide: APP_FILTER, useClass: GlobalExceptionFilter },
		{ provide: APP_GUARD, useClass: ThrottlerGuard },
		{ provide: APP_GUARD, useClass: JwtRequestContextGuard },
		{ provide: APP_GUARD, useClass: RolesGuard },
		{ provide: APP_GUARD, useClass: PlanTierGuard },
		{ provide: APP_INTERCEPTOR, useClass: RequestObservabilityInterceptor },
		{ provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
	],
})
export class AppModule {}
