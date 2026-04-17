/**
 * Purpose: Expose notification delivery records for county-level audit and support workflows.
 * Why important: Allows staff to verify whether transition SMS messages were delivered.
 * Used by: County admin, finance, and ward support dashboards.
 */
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { NotificationQueryService } from './notification-query.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationController {
  constructor(private readonly notificationQueryService: NotificationQueryService) {}

  @Get('deliveries')
  @Roles(UserRole.COUNTY_ADMIN, UserRole.FINANCE_OFFICER, UserRole.WARD_ADMIN)
  @ApiOperation({ summary: 'List notification delivery records for county support and audit use' })
  async listDeliveries(
    @Req() req: any,
    @Query('applicationId') applicationId?: string,
    @Query('limit') limit?: string,
  ) {
    const records = await this.notificationQueryService.listDeliveries(req.user.countyId, {
      applicationId,
      limit: limit ? Number.parseInt(limit, 10) : 50,
    });

    return { success: true, data: records };
  }
}
