/**
 * Purpose: Provide database service bindings for application modules.
 * Why important: Centralizes Prisma lifecycle and dependency injection scope.
 * Used by: Any module that requires persistent storage access.
 */
import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

@Global()
@Module({
	providers: [PrismaService],
	exports: [PrismaService],
})
export class DatabaseModule {}
