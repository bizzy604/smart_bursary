/**
 * Purpose: Expose program discovery endpoints to students.
 * Why important: Supports student discovery and county-admin program lifecycle actions.
 * Used by: Frontend student portal and county settings workflows.
 */
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { County } from '../../common/decorators/county.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateProgramDto } from './dto/create-program.dto';
import { ListProgramsDto } from './dto/list-programs.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { ProgramLifecycleService } from './program-lifecycle.service';
import { ProgramService } from './program.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Programs')
@ApiBearerAuth()
@Controller('programs')
export class ProgramController {
	constructor(
		private readonly programService: ProgramService,
		private readonly programLifecycleService: ProgramLifecycleService,
	) {}

	@Get()
	@ApiOperation({ summary: 'List programs for the current county with optional filters' })
	@ApiQuery({ name: 'status', required: false, type: String })
	@ApiQuery({ name: 'academicYear', required: false, type: String })
	listPrograms(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Query() query: ListProgramsDto,
	) {
		return this.programService.listPrograms(countyId, query, {
			userId: user['userId'] as string,
			role: user['role'] as UserRole,
		});
	}

	@Get('active')
	@ApiOperation({ summary: 'List active programs for the current county' })
	@ApiQuery({ name: 'status', required: false, type: String })
	@ApiQuery({ name: 'academicYear', required: false, type: String })
	listActivePrograms(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Query() query: ListProgramsDto,
	) {
		return this.programService.listActivePrograms(countyId, query, {
			userId: user['userId'] as string,
			role: user['role'] as UserRole,
		});
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get program details by id' })
	@ApiParam({ name: 'id', description: 'Program identifier' })
	getProgramById(
		@County() countyId: string,
		@Param('id') programId: string,
	) {
		return this.programService.getProgramById(countyId, programId);
	}

	@Post()
	@Roles(UserRole.COUNTY_ADMIN, UserRole.PLATFORM_OPERATOR)
	@ApiOperation({ summary: 'Create a new draft bursary program' })
	@ApiBody({ type: CreateProgramDto })
	createProgram(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Body() dto: CreateProgramDto,
	) {
		return this.programLifecycleService.createProgram(countyId, user['userId'] as string, dto);
	}

	@Patch(':id')
	@Roles(UserRole.COUNTY_ADMIN, UserRole.PLATFORM_OPERATOR)
	@ApiOperation({ summary: 'Update a draft bursary program' })
	@ApiParam({ name: 'id', description: 'Program identifier' })
	@ApiBody({ type: UpdateProgramDto })
	updateProgram(
		@County() countyId: string,
		@Param('id') programId: string,
		@Body() dto: UpdateProgramDto,
	) {
		return this.programLifecycleService.updateProgram(countyId, programId, dto);
	}

	@Post(':id/publish')
	@Roles(UserRole.COUNTY_ADMIN, UserRole.PLATFORM_OPERATOR)
	@ApiOperation({ summary: 'Publish a draft bursary program' })
	@ApiParam({ name: 'id', description: 'Program identifier' })
	publishProgram(
		@County() countyId: string,
		@Param('id') programId: string,
	) {
		return this.programLifecycleService.publishProgram(countyId, programId);
	}

	@Post(':id/close')
	@Roles(UserRole.COUNTY_ADMIN, UserRole.PLATFORM_OPERATOR)
	@ApiOperation({ summary: 'Close an active bursary program' })
	@ApiParam({ name: 'id', description: 'Program identifier' })
	closeProgram(
		@County() countyId: string,
		@Param('id') programId: string,
	) {
		return this.programLifecycleService.closeProgram(countyId, programId);
	}

	@Post(':id/archive')
	@Roles(UserRole.COUNTY_ADMIN, UserRole.PLATFORM_OPERATOR)
	@ApiOperation({ summary: 'Archive a program (hides from default listings)' })
	@ApiParam({ name: 'id', description: 'Program identifier' })
	archiveProgram(
		@County() countyId: string,
		@Param('id') programId: string,
	) {
		return this.programLifecycleService.archiveProgram(countyId, programId);
	}

	@Post(':id/unarchive')
	@Roles(UserRole.COUNTY_ADMIN, UserRole.PLATFORM_OPERATOR)
	@ApiOperation({ summary: 'Restore an archived program back to DRAFT' })
	@ApiParam({ name: 'id', description: 'Program identifier' })
	unarchiveProgram(
		@County() countyId: string,
		@Param('id') programId: string,
	) {
		return this.programLifecycleService.unarchiveProgram(countyId, programId);
	}

	@Delete(':id')
	@Roles(UserRole.COUNTY_ADMIN, UserRole.PLATFORM_OPERATOR)
	@ApiOperation({ summary: 'Soft-delete a program (removes it from all listings)' })
	@ApiParam({ name: 'id', description: 'Program identifier' })
	deleteProgram(
		@County() countyId: string,
		@Param('id') programId: string,
	) {
		return this.programLifecycleService.deleteProgram(countyId, programId);
	}
}
