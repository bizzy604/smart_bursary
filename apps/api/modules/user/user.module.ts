/**
 * Purpose: Wire the tenant user-directory CRUD module.
 * Why important: Isolates the user management surface from other domains.
 * Used by: AppModule.
 */
import { Module } from '@nestjs/common';

import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
	controllers: [UserController],
	providers: [UserService],
	exports: [UserService],
})
export class UserModule {}
