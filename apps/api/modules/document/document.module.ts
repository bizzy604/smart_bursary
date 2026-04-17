/**
 * Purpose: Wire the document module dependencies and controller.
 * Why important: Keeps document upload and scan workflows isolated in the modular monolith.
 * Used by: AppModule and the document feature routes.
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { QueueModule } from '../../queue/queue.module';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { S3Service } from './s3.service';

@Module({
  imports: [DatabaseModule, QueueModule],
  controllers: [DocumentController],
  providers: [DocumentService, S3Service],
  exports: [DocumentService],
})
export class DocumentModule {}
