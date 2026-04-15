/**
 * Purpose: Register the queue adapter used for document virus scanning.
 * Why important: Centralizes queue wiring and keeps infrastructure behind a module boundary.
 * Used by: AppModule and DocumentModule.
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { QueueService } from './queue.service';

@Module({
  imports: [DatabaseModule],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
