/**
 * Purpose: Expose document upload and retrieval endpoints.
 * Why important: Lets students attach files to applications and inspect scan status.
 * Used by: Document module routes and integration tests.
 */

import {
  Controller,
  Body,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { County } from '../../common/decorators/county.decorator';
import { DocumentService } from './document.service';
import { UploadDocumentDto } from './dto/upload-document.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @County() countyId: string,
    @CurrentUser() user: any,
    @UploadedFile() file: any,
    @Body() body: UploadDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.documentService.uploadDocument(
      countyId,
      user['userId'],
      body.applicationId,
      body.docType,
      file,
    );
  }

  @Get(':documentId')
  async getDocument(
    @Param('documentId') documentId: string,
    @County() countyId: string,
    @CurrentUser() user: any,
  ) {
    return this.documentService.getDocument(countyId, user['userId'], documentId);
  }

  @Get('application/:applicationId')
  async listDocuments(
    @Param('applicationId') applicationId: string,
    @County() countyId: string,
    @CurrentUser() user: any,
  ) {
    return this.documentService.listDocuments(countyId, user['userId'], applicationId);
  }
}
