/**
 * Purpose: Validate document upload, listing, and scan lifecycle behavior end to end.
 * Why important: Proves the P4 workflow works through the real HTTP surface and database.
 * Used by: P4 validation checklist and release gating.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';

describe('Document Module (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let applicantUserId: string;
  let countyId: string;
  let applicationId: string;
  let jwtService: JwtService;

  beforeAll(async () => {
    const email = `doc-test-${Date.now()}@test.com`;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = new JwtService({ secret: process.env.JWT_SECRET || 'test-jwt-secret-test-jwt-secret' });

    const county = await prisma.county.findUnique({
      where: { slug: 'turkana' },
    });
    if (!county) {
      throw new Error('County not found');
    }
    countyId = county.id;

    const ward = await prisma.ward.findFirst({
      where: { countyId },
    });

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

    applicantUserId = applicantUser.id;

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

    // Create a bursary program
    const program = await prisma.bursaryProgram.create({
      data: {
        name: 'Test Bursary',
        description: 'Test program for documents',
        countyId,
        budgetCeiling: 1000000,
        opensAt: new Date(Date.now() - 86400000), // 1 day ago
        closesAt: new Date(Date.now() + 864000000), // 10 days later
        status: 'ACTIVE',
        createdBy: applicantUserId,
      },
    });

    // Create application
    const appRes = await request(app.getHttpServer())
      .post('/api/v1/applications/draft')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        programId: program.id,
      });

    applicationId = appRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/documents/upload', () => {
    it('should upload document and queue for virus scan', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('applicationId', applicationId)
        .field('docType', 'BIRTH_CERTIFICATE')
        .attach('file', Buffer.from('test file content'), 'test-doc.pdf');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.applicationId).toBe(applicationId);
      expect(res.body.docType).toBe('BIRTH_CERTIFICATE');
      expect(res.body.scanStatus).toBe('PENDING');
      expect(res.body).toHaveProperty('uploadedAt');
    });

    it('should reject upload without file', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('applicationId', applicationId)
        .field('docType', 'BIRTH_CERTIFICATE');

      expect(res.status).toBe(400);
    });

    it('should reject upload without applicationId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('docType', 'BIRTH_CERTIFICATE')
        .attach('file', Buffer.from('test'), 'test.pdf');

      expect(res.status).toBe(400);
    });

    it('should reject upload to non-existent application', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('applicationId', '00000000-0000-0000-0000-000000000000')
        .field('docType', 'BIRTH_CERTIFICATE')
        .attach('file', Buffer.from('test'), 'test.pdf');

      expect(res.status).toBe(404);
    });

    it('should reject upload exceeding size limit', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      const res = await request(app.getHttpServer())
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('applicationId', applicationId)
        .field('docType', 'BIRTH_CERTIFICATE')
        .attach('file', largeBuffer, 'large.pdf');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/documents/:documentId', () => {
    let documentId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('applicationId', applicationId)
        .field('docType', 'NATIONAL_ID')
        .attach('file', Buffer.from('id content'), 'id.pdf');

      documentId = res.body.id;
    });

    it('should retrieve document by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(documentId);
      expect(res.body.docType).toBe('NATIONAL_ID');
      expect(res.body).toHaveProperty('scanStatus');
      expect(res.body).toHaveProperty('uploadedAt');
    });

    it('should return 404 for non-existent document', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/documents/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/documents/application/:applicationId', () => {
    it('should list all documents for application', async () => {
      // Upload multiple documents
      await request(app.getHttpServer())
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('applicationId', applicationId)
        .field('docType', 'SCHOOL_TRANSCRIPT')
        .attach('file', Buffer.from('transcript'), 'transcript.pdf');

      await request(app.getHttpServer())
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('applicationId', applicationId)
        .field('docType', 'FEE_LETTER')
        .attach('file', Buffer.from('fee letter'), 'fees.pdf');

      const res = await request(app.getHttpServer())
        .get(`/api/v1/documents/application/${applicationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      res.body.forEach((doc: any) => {
        expect(doc).toHaveProperty('id');
        expect(doc).toHaveProperty('docType');
        expect(doc).toHaveProperty('scanStatus');
      });
    });

    it('should return 404 for non-existent application', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/documents/application/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });
});
