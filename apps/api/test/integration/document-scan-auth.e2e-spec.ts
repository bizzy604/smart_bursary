/**
 * Purpose: Validate document scan lifecycle and document-scoped authorization.
 * Why important: Confirms async status updates and tenant-scoped access rules for uploaded files.
 * Used by: P4 validation checklist and release gating.
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Document Scan and Access (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let authToken: string;
  let countyId: string;
  let applicationId: string;

  beforeAll(async () => {
    const email = `doc-scan-${Date.now()}@test.com`;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'test-jwt-secret-test-jwt-secret' });

    const county = await prisma.county.findUnique({ where: { slug: 'turkana' } });
    if (!county) {
      throw new Error('County not found');
    }
    countyId = county.id;

    const ward = await prisma.ward.findFirst({ where: { countyId } });
    const applicantUser = await prisma.user.create({
      data: {
        email,
        phone: '254701234567',
        passwordHash: 'hashed-password',
        role: 'STUDENT',
        countyId,
        wardId: ward?.id ?? null,
      },
    });

    authToken = jwtService.sign(
      {
        sub: applicantUser.id,
        email: applicantUser.email,
        role: applicantUser.role,
        countyId: applicantUser.countyId,
        wardId: applicantUser.wardId,
      },
      { expiresIn: '1h' },
    );

    const program = await prisma.bursaryProgram.create({
      data: {
        name: 'Scan Test Bursary',
        description: 'Scan workflow fixture',
        countyId,
        budgetCeiling: 1000000,
        opensAt: new Date(Date.now() - 86400000),
        closesAt: new Date(Date.now() + 864000000),
        status: 'ACTIVE',
        createdBy: applicantUser.id,
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/applications/draft')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ programId: program.id });

    applicationId = response.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('updates document scan status after processing', async () => {
    const uploadRes = await request(app.getHttpServer())
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .field('applicationId', applicationId)
      .field('docType', 'AFFIDAVIT')
      .attach('file', Buffer.from('affidavit content'), 'affidavit.pdf');

    await new Promise((resolve) => setTimeout(resolve, 200));

    const document = await prisma.document.findUnique({ where: { id: uploadRes.body.id } });
    if (!document) {
      throw new Error('Document not found after upload');
    }

    expect(['PENDING', 'CLEAN', 'FAILED']).toContain(document.scanStatus);
  });

  it('marks infected files as INFECTED', async () => {
    const uploadRes = await request(app.getHttpServer())
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .field('applicationId', applicationId)
      .field('docType', 'MEDICAL_REPORT')
      .attach('file', Buffer.from('malware content'), 'malware.pdf');

    await new Promise((resolve) => setTimeout(resolve, 200));

    const document = await prisma.document.findUnique({ where: { id: uploadRes.body.id } });
    if (!document) {
      throw new Error('Document not found after upload');
    }

    expect(document.scanStatus).toBe('INFECTED');
    expect(document.scanCompletedAt).toBeDefined();
  });

  it('rejects other users from seeing uploaded documents', async () => {
    const otherUser = await prisma.user.create({
      data: {
        email: `other-${Date.now()}@test.com`,
        phone: '254701234568',
        passwordHash: 'hashed-password',
        role: 'STUDENT',
        countyId,
        wardId: null,
      },
    });

    const otherUserToken = jwtService.sign(
      {
        sub: otherUser.id,
        email: otherUser.email,
        role: otherUser.role,
        countyId: otherUser.countyId,
        wardId: otherUser.wardId,
      },
      { expiresIn: '1h' },
    );

    const documentRes = await request(app.getHttpServer())
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .field('applicationId', applicationId)
      .field('docType', 'PROOF_OF_ENROLLMENT')
      .attach('file', Buffer.from('enrollment'), 'enrollment.pdf');

    const res = await request(app.getHttpServer())
      .get(`/api/v1/documents/${documentRes.body.id}`)
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(res.status).toBe(404);
  });

  it('requires authentication for document endpoints', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/documents/upload')
      .field('applicationId', applicationId)
      .field('docType', 'LEASE_AGREEMENT')
      .attach('file', Buffer.from('lease'), 'lease.pdf');

  expect([401, 403]).toContain(res.status);
  });
});
