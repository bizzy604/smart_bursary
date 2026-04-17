/**
 * Purpose: Wire notification delivery orchestration for workflow status changes.
 * Why important: Enables queue-backed SMS dispatch with persisted delivery records.
 * Used by: Application, review, and disbursement modules.
 */
import { Module } from '@nestjs/common';

import { QueueModule } from '../../queue/queue.module';
import { NotificationController } from './notification.controller';
import { NotificationLifecycleService } from './notification-lifecycle.service';
import { NotificationQueryService } from './notification-query.service';
import { SmsService } from './sms.service';

@Module({
	imports: [QueueModule],
	controllers: [NotificationController],
	providers: [NotificationLifecycleService, NotificationQueryService, SmsService],
	exports: [NotificationLifecycleService, SmsService],
})
export class NotificationModule {}
