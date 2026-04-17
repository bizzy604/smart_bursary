/**
 * Purpose: Validate student application workflow end-to-end.
 * Why important: Confirms draft, section updates, submit, and tenant scoping behaviors remain stable.
 * Used by: Phase validation for application lifecycle regressions.
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';
import {
createActiveProgram,
createClosedProgram,
ensureCountyAndWard,
markStudentSubmissionReady,
registerStudentAndLogin,
} from './student-application.helpers';

describe('Student Application Workflow (e2e)', () => {
let app: INestApplication;
let prisma: PrismaService;
let studentToken = '';
let programId = '';
let applicationId = '';
let countyId = '';
let wardId = '';
const countySlug = 'turkana';

beforeAll(async () => {
const moduleFixture: TestingModule = await Test.createTestingModule({
imports: [AppModule],
}).compile();

app = moduleFixture.createNestApplication();
app.setGlobalPrefix('api/v1');
await app.init();

prisma = moduleFixture.get(PrismaService);
const seeded = await ensureCountyAndWard(prisma, countySlug);
countyId = seeded.countyId;
wardId = seeded.wardId;

const suffix = Date.now().toString();
const email = `student.${suffix}@example.com`;
const password = 'StrongPass123!';
studentToken = await registerStudentAndLogin(app, email, password, countySlug);

const program = await createActiveProgram(prisma, countyId, wardId, 'Test Bursary 2026');
programId = program.id;
await markStudentSubmissionReady(prisma, countyId, email);
});

afterAll(async () => {
await app.close();
});

it('student lists active programs for their county', async () => {
const response = await request(app.getHttpServer())
.get('/api/v1/programs/active')
.set('Authorization', `Bearer ${studentToken}`)
.expect(200);

expect(Array.isArray(response.body)).toBe(true);
expect(response.body.length).toBeGreaterThan(0);
expect(response.body[0].id).toBeDefined();
expect(response.body[0].name).toBeDefined();
});

it('student views program details', async () => {
const response = await request(app.getHttpServer())
.get(`/api/v1/programs/${programId}`)
.set('Authorization', `Bearer ${studentToken}`)
.expect(200);

expect(response.body.id).toBe(programId);
expect(response.body.name).toBeDefined();
expect(Array.isArray(response.body.eligibilityRules)).toBe(true);
});

it('student creates draft application for program', async () => {
const response = await request(app.getHttpServer())
.post('/api/v1/applications/draft')
.set('Authorization', `Bearer ${studentToken}`)
.send({ programId })
.expect(201);

expect(response.body.status).toBe('DRAFT');
expect(response.body.id).toBeDefined();
applicationId = response.body.id;
});

it('student updates application section with form data', async () => {
const response = await request(app.getHttpServer())
.put(`/api/v1/applications/${applicationId}/section`)
.set('Authorization', `Bearer ${studentToken}`)
.send({
sectionKey: 'ACADEMIC_INFO',
data: JSON.stringify({ institutionName: 'Test School', yearFormClass: '4' }),
})
.expect(200);

expect(response.body.sectionKey).toBe('ACADEMIC_INFO');
expect(response.body.isComplete).toBe(false);
expect(typeof response.body.data).toBe('object');
});

it('student views application with saved sections', async () => {
const response = await request(app.getHttpServer())
.get(`/api/v1/applications/${applicationId}`)
.set('Authorization', `Bearer ${studentToken}`)
.expect(200);

expect(response.body.id).toBe(applicationId);
expect(response.body.status).toBe('DRAFT');
expect(Array.isArray(response.body.sections)).toBe(true);
expect(response.body.sections.length).toBeGreaterThan(0);
});

it('student submits completed application', async () => {
const response = await request(app.getHttpServer())
.post('/api/v1/applications/submit')
.set('Authorization', `Bearer ${studentToken}`)
.send({ applicationId })
.expect(201);

expect(response.body.status).toBe('SUBMITTED');
expect(response.body.submittedAt).toBeDefined();
expect(response.body.submissionReference).toBeDefined();
});

it('student cannot create duplicate application for same program', async () => {
const response = await request(app.getHttpServer())
.post('/api/v1/applications/draft')
.set('Authorization', `Bearer ${studentToken}`)
.send({ programId })
.expect(201);

expect(response.body.id).toBe(applicationId);
});

it('student cannot create draft on closed program', async () => {
const closedProgram = await createClosedProgram(prisma, countyId, wardId, 'Closed Bursary 2025');
const draftRes = await request(app.getHttpServer())
.post('/api/v1/applications/draft')
.set('Authorization', `Bearer ${studentToken}`)
.send({ programId: closedProgram.id })
.expect(400);

expect(draftRes.body.message || draftRes.body.error).toBeTruthy();
});

it('student lists only their own applications', async () => {
const response = await request(app.getHttpServer())
.get('/api/v1/applications/my-applications')
.set('Authorization', `Bearer ${studentToken}`)
.expect(200);

expect(Array.isArray(response.body)).toBe(true);
expect(response.body.length).toBeGreaterThan(0);
expect(response.body[0].programId).toBeDefined();
expect(response.body[0].status).toBeDefined();
});
});
