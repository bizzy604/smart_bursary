/**
 * Purpose: Expose tenant-scoped user directory CRUD endpoints to county admins.
 * Why important: Lets county admins manage their team (invite, edit role, deactivate, delete).
 * Used by: Admin /settings/users UI.
 */
import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { County } from '../../common/decorators/county.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InviteUserDto } from './dto/invite-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Users')
@ApiBearerAuth()
@Roles(UserRole.COUNTY_ADMIN, UserRole.PLATFORM_OPERATOR)
@Controller('users')
export class UserController {
	constructor(private readonly userService: UserService) {}

	@Get()
	@ApiOperation({ summary: 'List staff users in the current tenant' })
	listUsers(@County() countyId: string | null, @Query() query: ListUsersDto) {
		return this.userService.listUsers(countyId, query);
	}

	@Get('_meta/wards')
	@ApiOperation({ summary: 'List wards in the current tenant (for ward-scoped role pickers).' })
	listTenantWards(@County() countyId: string | null) {
		return this.userService.listTenantWards(countyId);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get a single staff user' })
	@ApiParam({ name: 'id', description: 'User identifier' })
	getUser(@County() countyId: string | null, @Param('id', ParseUUIDPipe) userId: string) {
		return this.userService.getUser(countyId, userId);
	}

	@Post('invite')
	@ApiOperation({ summary: 'Invite a new staff user with a temporary password and verify token' })
	@ApiBody({ type: InviteUserDto })
	inviteUser(@County() countyId: string | null, @Body() dto: InviteUserDto) {
		return this.userService.inviteUser(countyId, dto);
	}

	@Patch(':id')
	@ApiOperation({ summary: 'Update a user role / ward / phone' })
	@ApiParam({ name: 'id', description: 'User identifier' })
	@ApiBody({ type: UpdateUserDto })
	updateUser(
		@County() countyId: string | null,
		@Param('id', ParseUUIDPipe) userId: string,
		@Body() dto: UpdateUserDto,
	) {
		return this.userService.updateUser(countyId, userId, dto);
	}

	@Post(':id/deactivate')
	@HttpCode(200)
	@ApiOperation({ summary: 'Deactivate a user account (revokes login access).' })
	@ApiParam({ name: 'id', description: 'User identifier' })
	deactivateUser(
		@County() countyId: string | null,
		@CurrentUser() user: Record<string, unknown>,
		@Param('id', ParseUUIDPipe) userId: string,
	) {
		return this.userService.deactivateUser(countyId, userId, user['userId'] as string);
	}

	@Post(':id/reactivate')
	@HttpCode(200)
	@ApiOperation({ summary: 'Reactivate a previously deactivated user account.' })
	@ApiParam({ name: 'id', description: 'User identifier' })
	reactivateUser(
		@County() countyId: string | null,
		@Param('id', ParseUUIDPipe) userId: string,
	) {
		return this.userService.reactivateUser(countyId, userId);
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Soft-delete a user (sets deletedAt and deactivates).' })
	@ApiParam({ name: 'id', description: 'User identifier' })
	deleteUser(
		@County() countyId: string | null,
		@CurrentUser() user: Record<string, unknown>,
		@Param('id', ParseUUIDPipe) userId: string,
	) {
		return this.userService.deleteUser(countyId, userId, user['userId'] as string);
	}
}
