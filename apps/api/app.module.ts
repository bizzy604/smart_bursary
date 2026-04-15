/**
 * Purpose: Compose application-level modules and global providers.
 * Why important: Centralizes runtime wiring for config, persistence, and global filters.
 * Used by: NestJS bootstrap in main.ts.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';
import configuration from './config/configuration';
import databaseConfig from './config/database.config';
import validationSchema from './config/validation';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { ApplicationModule } from './modules/application/application.module';
import { ProgramModule } from './modules/program/program.module';
import { DocumentModule } from './modules/document/document.module';
import { QueueModule } from './queue/queue.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			cache: true,
			load: [configuration, databaseConfig],
			validationSchema,
		}),
		DatabaseModule,
		RedisModule,
		QueueModule,
		AuthModule,
		ApplicationModule,
		ProgramModule,
		DocumentModule,
	],
	controllers: [AppController],
	providers: [
		{ provide: APP_FILTER, useClass: PrismaExceptionFilter },
		{ provide: APP_FILTER, useClass: GlobalExceptionFilter },
		{ provide: APP_GUARD, useClass: RolesGuard },
		{ provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
	],
})
export class AppModule {}
