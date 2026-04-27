/**
 * Purpose: Expose application lifecycle and audit retrieval endpoints.
 * Why important: Provides controlled access to create/submit flows and workflow audit visibility.
 * Used by: Student application workflow and county review audit surfaces.
 */
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { County } from '../../common/decorators/county.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApplicationAuditService } from './application-audit.service';
import { ApplicationSubmissionService } from './application-submission.service';
import { ApplicationService } from './application.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { UpdateApplicationSectionDto } from './dto/update-application-section.dto';
import { SectionService } from './section.service';

@UseGuards(JwtAuthGuard)
@Roles(UserRole.STUDENT)
@ApiTags('Applications')
@ApiBearerAuth()
@Controller('applications')
export class ApplicationController {
	constructor(
		private readonly applicationAuditService: ApplicationAuditService,
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

	@Get(':id/timeline')
	@Roles(UserRole.STUDENT, UserRole.WARD_ADMIN, UserRole.FINANCE_OFFICER, UserRole.COUNTY_ADMIN)
	@ApiOperation({ summary: 'Get application timeline audit events by id' })
	@ApiParam({ name: 'id', description: 'Application identifier' })
	getApplicationTimeline(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Param('id') applicationId: string,
	) {
		return this.applicationAuditService.getTimeline(countyId, applicationId, {
			userId: user['userId'] as string,
			role: user['role'] as UserRole,
			wardId: (user['wardId'] as string | null) ?? null,
		});
	}

	@Get(':id/review-notes')
	@Roles(UserRole.STUDENT, UserRole.WARD_ADMIN, UserRole.FINANCE_OFFICER, UserRole.COUNTY_ADMIN)
	@ApiOperation({ summary: 'Get application review-note audit entries by id' })
	@ApiParam({ name: 'id', description: 'Application identifier' })
	getApplicationReviewNotes(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Param('id') applicationId: string,
	) {
		return this.applicationAuditService.getReviewNotes(countyId, applicationId, {
			userId: user['userId'] as string,
			role: user['role'] as UserRole,
			wardId: (user['wardId'] as string | null) ?? null,
		});
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

	@Post(':id/withdraw')
	@HttpCode(200)
	@ApiOperation({ summary: 'Withdraw a submitted application' })
	@ApiParam({ name: 'id', description: 'Application identifier' })
	withdrawApplication(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Param('id') applicationId: string,
	) {
		const applicantId = user['userId'] as string;
		return this.applicationService.withdrawApplication(countyId, applicantId, applicationId);
	}

	@Delete(':id/draft')
	@ApiOperation({ summary: 'Soft-delete a draft application' })
	@ApiParam({ name: 'id', description: 'Application identifier' })
	deleteDraftApplication(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Param('id') applicationId: string,
	) {
		const applicantId = user['userId'] as string;
		return this.applicationService.deleteDraftApplication(countyId, applicantId, applicationId);
	}
}
