/**
 * Purpose: Expose application lifecycle endpoints to students.
 * Why important: Provides entry points for creating, editing, and submitting applications.
 * Used by: Frontend student portal for application form workflow.
 */
import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { County } from '../../common/decorators/county.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApplicationSubmissionService } from './application-submission.service';
import { ApplicationService } from './application.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { UpdateApplicationSectionDto } from './dto/update-application-section.dto';
import { SectionService } from './section.service';

@UseGuards(JwtAuthGuard)
@ApiTags('Applications')
@ApiBearerAuth()
@Controller('applications')
export class ApplicationController {
	constructor(
		private readonly applicationService: ApplicationService,
		private readonly applicationSubmissionService: ApplicationSubmissionService,
		private readonly sectionService: SectionService,
	) {}

	@Post('draft')
	@ApiOperation({ summary: 'Create a new application draft' })
	@ApiBody({ type: CreateApplicationDto })
	createDraft(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Body() dto: CreateApplicationDto,
	) {
		const applicantId = user['userId'] as string;
		return this.applicationSubmissionService.createDraft(countyId, applicantId, dto);
	}

	@Get('my-applications')
	@ApiOperation({ summary: 'List current user applications' })
	listMyApplications(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
	) {
		const applicantId = user['userId'] as string;
		return this.applicationService.listMyApplications(countyId, applicantId);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get application details by id' })
	@ApiParam({ name: 'id', description: 'Application identifier' })
	getApplication(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Param('id') applicationId: string,
	) {
		const applicantId = user['userId'] as string;
		return this.applicationService.getApplication(countyId, applicantId, applicationId);
	}

	@Put(':id/section')
	@ApiOperation({ summary: 'Update a specific application section' })
	@ApiParam({ name: 'id', description: 'Application identifier' })
	@ApiBody({ type: UpdateApplicationSectionDto })
	updateSection(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Param('id') applicationId: string,
		@Body() dto: UpdateApplicationSectionDto,
	) {
		const applicantId = user['userId'] as string;
		return this.sectionService.updateSection(countyId, applicantId, applicationId, dto);
	}

	@Post('submit')
	@ApiOperation({ summary: 'Submit a draft application' })
	@ApiBody({ type: SubmitApplicationDto })
	submitApplication(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Body() dto: SubmitApplicationDto,
	) {
		const applicantId = user['userId'] as string;
		return this.applicationSubmissionService.submitApplication(countyId, applicantId, dto);
	}
}
