/**
 * Purpose: Expose application lifecycle endpoints to students.
 * Why important: Provides entry points for creating, editing, and submitting applications.
 * Used by: Frontend student portal for application form workflow.
 */
import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';

import { County } from '../../common/decorators/county.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApplicationService } from './application.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { UpdateApplicationSectionDto } from './dto/update-application-section.dto';

@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationController {
	constructor(private readonly applicationService: ApplicationService) {}

	@Post('draft')
	createDraft(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Body() dto: CreateApplicationDto,
	) {
		const applicantId = user['userId'] as string;
		return this.applicationService.createDraft(countyId, applicantId, dto);
	}

	@Get('my-applications')
	listMyApplications(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
	) {
		const applicantId = user['userId'] as string;
		return this.applicationService.listMyApplications(countyId, applicantId);
	}

	@Get(':id')
	getApplication(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Param('id') applicationId: string,
	) {
		const applicantId = user['userId'] as string;
		return this.applicationService.getApplication(countyId, applicantId, applicationId);
	}

	@Put(':id/section')
	updateSection(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Param('id') applicationId: string,
		@Body() dto: UpdateApplicationSectionDto,
	) {
		const applicantId = user['userId'] as string;
		return this.applicationService.updateSection(countyId, applicantId, applicationId, dto);
	}

	@Post('submit')
	submitApplication(
		@County() countyId: string,
		@CurrentUser() user: Record<string, unknown>,
		@Body() dto: SubmitApplicationDto,
	) {
		const applicantId = user['userId'] as string;
		return this.applicationService.submitApplication(countyId, applicantId, dto);
	}
}
