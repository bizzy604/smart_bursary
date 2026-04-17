/**
 * Purpose: Expose student profile retrieval and section update endpoints.
 * Why important: Enables completion of profile data required before application submission.
 * Used by: Student portal profile workflow.
 */
import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { County } from '../../common/decorators/county.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UpdateAcademicDto } from './dto/update-academic.dto';
import { UpdateFamilyDto } from './dto/update-family.dto';
import { UpdatePersonalDto } from './dto/update-personal.dto';
import { ProfileService } from './profile.service';

@UseGuards(JwtAuthGuard)
@Roles(UserRole.STUDENT)
@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
	constructor(private readonly profileService: ProfileService) {}

	@Get()
	@ApiOperation({ summary: 'Get the authenticated student profile' })
	getProfile(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
	) {
		return this.profileService.getProfile(countyId, user['userId'] as string);
	}

	@Patch('personal')
	@ApiOperation({ summary: 'Update personal section of the student profile' })
	@ApiBody({ type: UpdatePersonalDto })
	updatePersonal(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Body() dto: UpdatePersonalDto,
	) {
		return this.profileService.updatePersonal(countyId, user['userId'] as string, dto);
	}

	@Patch('academic')
	@ApiOperation({ summary: 'Update academic section of the student profile' })
	@ApiBody({ type: UpdateAcademicDto })
	updateAcademic(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Body() dto: UpdateAcademicDto,
	) {
		return this.profileService.updateAcademic(countyId, user['userId'] as string, dto);
	}

	@Patch('family')
	@ApiOperation({ summary: 'Update family and financial section of the student profile' })
	@ApiBody({ type: UpdateFamilyDto })
	updateFamily(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Body() dto: UpdateFamilyDto,
	) {
		return this.profileService.updateFamily(countyId, user['userId'] as string, dto);
	}

	@Get('completion')
	@ApiOperation({ summary: 'Get profile completion status by section' })
	getCompletion(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
	) {
		return this.profileService.getCompletion(countyId, user['userId'] as string);
	}
}
