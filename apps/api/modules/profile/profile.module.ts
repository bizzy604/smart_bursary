/**
 * Purpose: Wire profile module services and controller dependencies.
 * Why important: Establishes the profile boundary for student onboarding and completion checks.
 * Used by: AppModule imports and ApplicationSubmissionService gating logic.
 */
import { Module } from '@nestjs/common';

import { AcademicInfoService } from './academic-info.service';
import { FamilyInfoService } from './family-info.service';
import { ProfileCompletionService } from './profile-completion.service';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
	controllers: [ProfileController],
	providers: [ProfileService, ProfileCompletionService, AcademicInfoService, FamilyInfoService],
	exports: [ProfileService, ProfileCompletionService],
})
export class ProfileModule {}
