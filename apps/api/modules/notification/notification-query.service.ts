/**
 * Purpose: Query persisted notification delivery records for audit and support views.
 * Why important: Makes SMS delivery outcomes visible without direct database access.
 * Used by: NotificationController delivery list endpoint.
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NotificationQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async listDeliveries(countyId: string, options: { applicationId?: string; limit?: number }) {
    const records = await this.prisma.notificationDelivery.findMany({
      where: {
        countyId,
        ...(options.applicationId ? { applicationId: options.applicationId } : {}),
      },
      select: {
        id: true,
        applicationId: true,
        recipientUserId: true,
        eventType: true,
        status: true,
        recipientPhone: true,
        queueJobId: true,
        providerMessageId: true,
        failureReason: true,
        attemptCount: true,
        queuedAt: true,
        sentAt: true,
        failedAt: true,
      },
      orderBy: { queuedAt: 'desc' },
      take: options.limit ?? 50,
    });

    return records;
  }
}
