/**
 * Purpose: Wire review controller and application services.
 * Why important: Defines review module ownership boundary in the modular monolith.
 * Used by: AppModule imports for P5 review and allocation workflows.
 */
import { Module } from '@nestjs/common';

import { NotificationModule } from '../notification/notification.module';
import { CountyReviewService } from './county-review.service';
import { ReviewController } from './review.controller';
import { WardReviewService } from './ward-review.service';

@Module({
	imports: [NotificationModule],
	controllers: [ReviewController],
	providers: [WardReviewService, CountyReviewService],
})
export class ReviewModule {}
