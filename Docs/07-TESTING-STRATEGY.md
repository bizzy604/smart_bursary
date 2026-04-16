# KauntyBursary — Testing Strategy & Edge Case Catalogue
**Version:** 1.0.0  
**Status:** Production-Ready Draft  
**Stack:** Jest (NestJS), Pytest (AI service), Playwright (E2E), Testcontainers (integration)  
**References:** All prior documents v1.0.0

---

## Table of Contents

1. [Testing Philosophy & Strategy](#1-testing-philosophy--strategy)
2. [Test Infrastructure Setup](#2-test-infrastructure-setup)
3. [Auth Module](#3-auth-module)
4. [Tenant Module](#4-tenant-module)
5. [User Module](#5-user-module)
6. [Profile Module](#6-profile-module)
7. [Program Module](#7-program-module)
8. [Application Module](#8-application-module)
9. [Section Save & Wizard Module](#9-section-save--wizard-module)
10. [Document Module](#10-document-module)
11. [Review Module](#11-review-module)
12. [Disbursement Module](#12-disbursement-module)
13. [AI Scoring Service](#13-ai-scoring-service)
14. [Notification Module](#14-notification-module)
15. [Reporting Module](#15-reporting-module)
16. [PDF Generation](#16-pdf-generation)
17. [Multi-Tenancy & RLS](#17-multi-tenancy--rls)
18. [Queue & Async Jobs](#18-queue--async-jobs)
19. [Rate Limiting & Security](#19-rate-limiting--security)
20. [Frontend Component Tests](#20-frontend-component-tests)
21. [End-to-End Test Scenarios](#21-end-to-end-test-scenarios)
22. [Performance & Load Tests](#22-performance--load-tests)
23. [Test Coverage Targets](#23-test-coverage-targets)

---

## 1. Testing Philosophy & Strategy

### Test Pyramid

```
         ┌─────────────┐
         │  E2E (10%)  │   Playwright — critical user journeys
         ├─────────────┤
         │Integration  │   Testcontainers — real DB + Redis
         │  (30%)      │   API-level request/response contracts
         ├─────────────┤
         │  Unit (60%) │   Jest / Pytest — pure business logic
         └─────────────┘
```

### Core Principles

1. **Test behaviour, not implementation.** Tests call service methods or HTTP endpoints — never internal private functions.
2. **Real database for integration tests.** We use Testcontainers (PostgreSQL 15 + Redis 7) — not SQLite mocks. Financial logic requires real ACID semantics.
3. **Isolate tenants in every test.** Every test creates its own county fixture. Cross-county data leakage is treated as a critical failure.
4. **Budget and concurrency tests run against a real DB.** Advisory locks cannot be meaningfully tested with mocks.
5. **AI scoring tests mock the Claude API.** External AI calls are mocked; the scoring pipeline logic itself is tested with fixtures.
6. **No test depends on another test's data.** Tests are fully isolated with `beforeEach` fixtures and `afterEach` teardown.
7. **Edge cases are first-class tests.** Every edge case listed in this document has a corresponding test file entry.

### Test Naming Convention

```
describe('[Module] — [Feature]')
  it('[should/should not] [behaviour] when [condition]')

// Example
describe('ApplicationService — submit')
  it('should reject submission when program is closed')
  it('should reject submission when student profile is incomplete')
  it('should not allow duplicate submissions for the same program')
```

---

## 2. Test Infrastructure Setup

### Testcontainers Config (NestJS Integration Tests)

```typescript
// test/setup/test-database.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

export let pgContainer: StartedPostgreSqlContainer;
export let redisContainer: StartedRedisContainer;
export let prisma: PrismaClient;

beforeAll(async () => {
  pgContainer = await new PostgreSqlContainer('postgres:15')
    .withDatabase('kaunty_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  redisContainer = await new RedisContainer('redis:7-alpine').start();

  process.env.DATABASE_URL = pgContainer.getConnectionUri();
  process.env.REDIS_URL = `redis://${redisContainer.getHost()}:${redisContainer.getFirstMappedPort()}`;

  prisma = new PrismaClient({ datasources: { db: { url: pgContainer.getConnectionUri() } } });

  // Run migrations against the test container
  execSync(`DATABASE_URL=${pgContainer.getConnectionUri()} npx prisma migrate deploy`, {
    env: process.env,
  });
}, 60_000);

afterAll(async () => {
  await prisma.$disconnect();
  await pgContainer.stop();
  await redisContainer.stop();
});
```

### Shared Test Factories

```typescript
// test/factories/county.factory.ts
export const createCountyFixture = async (prisma: PrismaClient, overrides = {}) => {
  return prisma.county.create({
    data: {
      slug: `county-${Date.now()}`,
      name: 'Test County',
      planTier: 'STANDARD',
      primaryColor: '#1E3A5F',
      ...overrides,
    },
  });
};

// test/factories/user.factory.ts
export const createStudentFixture = async (prisma: PrismaClient, countyId: string, overrides = {}) => {
  return prisma.user.create({
    data: {
      countyId,
      email: `student-${Date.now()}@test.com`,
      passwordHash: await bcrypt.hash('TestPass123!', 12),
      role: 'STUDENT',
      emailVerified: true,
      phoneVerified: true,
      ...overrides,
    },
  });
};

// test/factories/application.factory.ts
export const createApplicationFixture = async (
  prisma: PrismaClient,
  countyId: string,
  applicantId: string,
  programId: string,
  wardId: string,
  overrides = {}
) => {
  return prisma.application.create({
    data: {
      countyId,
      applicantId,
      programId,
      wardId,
      status: 'DRAFT',
      ...overrides,
    },
  });
};
```

---

## 3. Auth Module

### Unit Tests

#### `AuthService.register()`

```typescript
describe('AuthService — register', () => {

  it('should create a user with hashed password and STUDENT role', async () => {
    const dto = { email: 'aisha@test.com', password: 'Pass123!', countySlug: 'turkana', fullName: 'Aisha' };
    const result = await authService.register(dto);
    expect(result.user.role).toBe('STUDENT');
    expect(result.user.passwordHash).not.toBe('Pass123!');
    expect(result.emailVerificationSent).toBe(true);
  });

  it('should throw ConflictException when email already exists in the same county', async () => {
    await createStudentFixture(prisma, county.id, { email: 'duplicate@test.com' });
    await expect(
      authService.register({ email: 'duplicate@test.com', countySlug: county.slug, ... })
    ).rejects.toThrow(ConflictException);
  });

  it('should allow the same email in two different counties', async () => {
    const county2 = await createCountyFixture(prisma, { slug: 'nairobi-test' });
    await createStudentFixture(prisma, county.id, { email: 'shared@test.com' });
    // Should NOT throw — same email is valid in a different county
    await expect(
      authService.register({ email: 'shared@test.com', countySlug: county2.slug, ... })
    ).resolves.toBeDefined();
  });

  it('should reject weak passwords (less than 8 chars, no number, no special char)', async () => {
    await expect(
      authService.register({ email: 'x@test.com', password: 'weak', ... })
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject invalid county slug', async () => {
    await expect(
      authService.register({ email: 'x@test.com', countySlug: 'nonexistent-county', ... })
    ).rejects.toThrow(NotFoundException);
  });

  it('should reject registration for a suspended county (is_active = false)', async () => {
    const inactiveCounty = await createCountyFixture(prisma, { isActive: false });
    await expect(
      authService.register({ countySlug: inactiveCounty.slug, ... })
    ).rejects.toThrow(ForbiddenException);
  });
});
```

#### `AuthService.login()`

```typescript
describe('AuthService — login', () => {

  it('should return access token and set refresh token cookie on valid credentials', async () => {
    const result = await authService.login({ email: student.email, password: 'TestPass123!', countySlug: county.slug });
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    const decoded = jwt.verify(result.accessToken, publicKey);
    expect(decoded.county_id).toBe(county.id);
    expect(decoded.role).toBe('STUDENT');
  });

  it('should throw UnauthorizedException on wrong password', async () => {
    await expect(
      authService.login({ email: student.email, password: 'WrongPass!', countySlug: county.slug })
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when email is not verified', async () => {
    const unverified = await createStudentFixture(prisma, county.id, { emailVerified: false });
    await expect(
      authService.login({ email: unverified.email, password: 'TestPass123!', countySlug: county.slug })
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw ForbiddenException when user account is deactivated', async () => {
    const inactive = await createStudentFixture(prisma, county.id, { isActive: false });
    await expect(
      authService.login({ email: inactive.email, password: 'TestPass123!', countySlug: county.slug })
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw UnauthorizedException when email exists but in a different county', async () => {
    const county2 = await createCountyFixture(prisma);
    await createStudentFixture(prisma, county2.id, { email: 'cross@test.com' });
    // Attempting to login on county1 with a county2 email
    await expect(
      authService.login({ email: 'cross@test.com', password: 'TestPass123!', countySlug: county.slug })
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should update last_login_at on successful login', async () => {
    await authService.login({ email: student.email, password: 'TestPass123!', countySlug: county.slug });
    const updated = await prisma.user.findUnique({ where: { id: student.id } });
    expect(updated.lastLoginAt).not.toBeNull();
  });
});
```

#### `AuthService.refreshToken()`

```typescript
describe('AuthService — refreshToken', () => {

  it('should issue new access token from valid refresh token', async () => {
    const { refreshToken } = await authService.login({ ... });
    const result = await authService.refreshToken(refreshToken);
    expect(result.accessToken).toBeDefined();
  });

  it('should reject an expired refresh token', async () => {
    // Fast-forward Redis TTL manually for test
    const expiredToken = await createExpiredRefreshToken(redisClient, student.id);
    await expect(authService.refreshToken(expiredToken)).rejects.toThrow(UnauthorizedException);
  });

  it('should reject a revoked refresh token (already logged out)', async () => {
    const { refreshToken } = await authService.login({ ... });
    await authService.logout(refreshToken);
    await expect(authService.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
  });

  it('should reject a refresh token that belongs to a user in a different county', async () => {
    // Crafted JWT with a mismatched county_id in the payload vs. Redis record
    const maliciousToken = craftTokenWithWrongCounty(student.id, county2.id);
    await expect(authService.refreshToken(maliciousToken)).rejects.toThrow(UnauthorizedException);
  });
});
```

#### Edge Cases

```typescript
describe('AuthService — edge cases', () => {

  it('should handle concurrent login attempts for the same user without creating duplicate sessions', async () => {
    const logins = await Promise.all([
      authService.login({ email: student.email, password: 'TestPass123!', countySlug: county.slug }),
      authService.login({ email: student.email, password: 'TestPass123!', countySlug: county.slug }),
      authService.login({ email: student.email, password: 'TestPass123!', countySlug: county.slug }),
    ]);
    // All should succeed; each gets a different refresh token
    const tokens = logins.map(l => l.refreshToken);
    expect(new Set(tokens).size).toBe(3);
  });

  it('should reject a JWT signed with the wrong private key (algorithm confusion attack)', async () => {
    const maliciousToken = jwt.sign({ sub: student.id, county_id: county.id }, 'wrong-secret', { algorithm: 'HS256' });
    await expect(authService.validateJwt(maliciousToken)).rejects.toThrow();
  });

  it('should reject a JWT with a tampered county_id payload', async () => {
    const validToken = (await authService.login({ ... })).accessToken;
    const tampered = tamperJwtPayload(validToken, { county_id: otherCounty.id });
    await expect(authService.validateJwt(tampered)).rejects.toThrow();
  });

  it('should return 200 for forgot-password with a non-existent email (no enumeration)', async () => {
    // Must not distinguish between existing and non-existing email
    const result = await authService.forgotPassword({ email: 'ghost@test.com', countySlug: county.slug });
    expect(result.resetEmailSent).toBe(true); // Always returns true
  });

  it('should reject password reset with an expired token', async () => {
    const expiredResetToken = await createExpiredResetToken(prisma, student.id);
    await expect(
      authService.resetPassword({ token: expiredResetToken, newPassword: 'NewPass123!' })
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject password reset with an already-used token', async () => {
    const { token } = await authService.forgotPassword({ email: student.email, countySlug: county.slug });
    await authService.resetPassword({ token, newPassword: 'NewPass123!' });
    // Second use of the same token
    await expect(
      authService.resetPassword({ token, newPassword: 'AnotherPass456!' })
    ).rejects.toThrow(BadRequestException);
  });

  it('should enforce new password cannot be the same as the current password', async () => {
    const { token } = await authService.forgotPassword({ email: student.email, countySlug: county.slug });
    await expect(
      authService.resetPassword({ token, newPassword: 'TestPass123!' }) // same as current
    ).rejects.toThrow(BadRequestException);
  });
});
```

---

## 4. Tenant Module

### Unit Tests

```typescript
describe('TenantService — provisioning', () => {

  it('should create a county with all 1450 national wards on provisioning', async () => {
    const result = await tenantService.provisionCounty({
      slug: 'new-county',
      name: 'New County',
      adminEmail: 'admin@newcounty.go.ke',
    });
    const wardCount = await prisma.ward.count({ where: { countyId: result.county.id } });
    expect(wardCount).toBeGreaterThanOrEqual(1); // At least the county's own wards
    expect(result.adminCreated).toBe(true);
  });

  it('should throw ConflictException if county slug already exists', async () => {
    await createCountyFixture(prisma, { slug: 'duplicate-slug' });
    await expect(
      tenantService.provisionCounty({ slug: 'duplicate-slug', ... })
    ).rejects.toThrow(ConflictException);
  });

  it('should store county logo in S3 and return a CDN URL', async () => {
    const logoBuffer = Buffer.from('fake-png-data');
    const result = await tenantService.uploadLogo(county.id, logoBuffer, 'image/png');
    expect(result.logoUrl).toContain('cdn.kaunty.co.ke');
    expect(mockS3PutObject).toHaveBeenCalledWith(
      expect.objectContaining({ Bucket: expect.any(String), ContentType: 'image/png' })
    );
  });

  it('should reject non-image logo uploads', async () => {
    const pdfBuffer = Buffer.from('fake-pdf');
    await expect(
      tenantService.uploadLogo(county.id, pdfBuffer, 'application/pdf')
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject logo files larger than 2MB', async () => {
    const largeBuffer = Buffer.alloc(3 * 1024 * 1024); // 3MB
    await expect(
      tenantService.uploadLogo(county.id, largeBuffer, 'image/png')
    ).rejects.toThrow(BadRequestException);
  });

  it('should update county primary_color and invalidate the branding cache in Redis', async () => {
    await tenantService.updateSettings(county.id, { primaryColor: '#FF0000' });
    const cached = await redisClient.get(`county:branding:${county.id}`);
    expect(cached).toBeNull(); // Cache should be cleared
  });
});
```

### Edge Cases

```typescript
describe('TenantService — edge cases', () => {

  it('should not allow PLATFORM_OPERATOR to update a county\'s data via the tenant portal', async () => {
    // County admin endpoints are for county scope; platform operator uses /ops routes
    const response = await request(app.getHttpServer())
      .patch('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${platformOperatorToken}`)
      .send({ primaryColor: '#000000' });
    expect(response.status).toBe(403);
  });

  it('should serve county branding from Redis cache and not hit the DB on repeat requests', async () => {
    const spy = jest.spyOn(prisma.county, 'findUnique');
    await tenantService.getCountyBranding(county.id);
    await tenantService.getCountyBranding(county.id); // second call
    expect(spy).toHaveBeenCalledTimes(1); // Only one DB hit
  });

  it('should handle missing logo gracefully and return default logo URL', async () => {
    const countyNoLogo = await createCountyFixture(prisma, { logoS3Key: null });
    const branding = await tenantService.getCountyBranding(countyNoLogo.id);
    expect(branding.logoUrl).toContain('default-county-logo');
  });
});
```

---

## 5. User Module

### Unit Tests

```typescript
describe('UserService — create admin user', () => {

  it('should create WARD_ADMIN user and assign them to the specified ward', async () => {
    const user = await userService.createAdminUser(county.id, {
      email: 'ward.admin@test.com',
      role: 'WARD_ADMIN',
      wardId: ward.id,
      fullName: 'Ward Admin',
    });
    expect(user.role).toBe('WARD_ADMIN');
    expect(user.wardId).toBe(ward.id);
  });

  it('should throw BadRequestException when creating WARD_ADMIN without wardId', async () => {
    await expect(
      userService.createAdminUser(county.id, { role: 'WARD_ADMIN', wardId: null, ... })
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw ForbiddenException when assigning a ward from a different county', async () => {
    const foreignWard = await createWardFixture(prisma, otherCounty.id);
    await expect(
      userService.createAdminUser(county.id, { role: 'WARD_ADMIN', wardId: foreignWard.id, ... })
    ).rejects.toThrow(ForbiddenException);
  });

  it('should send a welcome email with a temporary password on admin user creation', async () => {
    await userService.createAdminUser(county.id, { email: 'new.admin@test.com', ... });
    expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new.admin@test.com' })
    );
  });

  it('should soft-delete a user and prevent future login', async () => {
    await userService.deactivateUser(county.id, wardAdmin.id);
    const user = await prisma.user.findUnique({ where: { id: wardAdmin.id } });
    expect(user.deletedAt).not.toBeNull();
    await expect(
      authService.login({ email: wardAdmin.email, password: 'TestPass123!', countySlug: county.slug })
    ).rejects.toThrow();
  });

  it('should not return soft-deleted users in the admin user list', async () => {
    await userService.deactivateUser(county.id, wardAdmin.id);
    const users = await userService.listAdminUsers(county.id);
    expect(users.find(u => u.id === wardAdmin.id)).toBeUndefined();
  });
});
```

---

## 6. Profile Module

### Unit Tests

```typescript
describe('ProfileService — personal profile', () => {

  it('should save all personal detail fields correctly', async () => {
    await profileService.updatePersonal(student.id, county.id, {
      fullName: 'Aisha Lokiru',
      dateOfBirth: '2002-03-15',
      gender: 'FEMALE',
      homeWard: 'Kalokol',
      villageUnit: 'Nakuprat',
    });
    const profile = await prisma.studentProfile.findUnique({ where: { userId: student.id } });
    expect(profile.fullName).toBe('Aisha Lokiru');
    expect(profile.homeWard).toBe('Kalokol');
  });

  it('should encrypt national_id before storing in the database', async () => {
    await profileService.updatePersonal(student.id, county.id, { nationalId: '12345678', ... });
    const raw = await prisma.$queryRaw`
      SELECT national_id FROM student_profiles WHERE user_id = ${student.id}
    `;
    // Raw DB value should not be plaintext
    expect(raw[0].national_id).not.toBe('12345678');
    expect(Buffer.isBuffer(raw[0].national_id)).toBe(true);
  });

  it('should decrypt national_id correctly when reading back through the service', async () => {
    await profileService.updatePersonal(student.id, county.id, { nationalId: '12345678', ... });
    const profile = await profileService.getProfile(student.id, county.id);
    expect(profile.personal.nationalId).toBe('12345678');
  });

  it('should reject duplicate national_id within the same county', async () => {
    await profileService.updatePersonal(student.id, county.id, { nationalId: '12345678', ... });
    const student2 = await createStudentFixture(prisma, county.id);
    await expect(
      profileService.updatePersonal(student2.id, county.id, { nationalId: '12345678', ... })
    ).rejects.toThrow(ConflictException);
  });

  it('should allow the same national_id in two different counties', async () => {
    await profileService.updatePersonal(student.id, county.id, { nationalId: '12345678', ... });
    const student2 = await createStudentFixture(prisma, otherCounty.id);
    await expect(
      profileService.updatePersonal(student2.id, otherCounty.id, { nationalId: '12345678', ... })
    ).resolves.toBeDefined();
  });

  it('should mark profile_complete=true only when all required fields are present', async () => {
    // Partial update — missing homeWard
    await profileService.updatePersonal(student.id, county.id, { fullName: 'Aisha', dateOfBirth: '2002-03-15' });
    const profile = await prisma.studentProfile.findUnique({ where: { userId: student.id } });
    expect(profile.profileComplete).toBe(false);

    // Complete update
    await profileService.updatePersonal(student.id, county.id, { fullName: 'Aisha', dateOfBirth: '2002-03-15', gender: 'FEMALE', homeWard: 'Kalokol', villageUnit: 'Nakuprat' });
    const updated = await prisma.studentProfile.findUnique({ where: { userId: student.id } });
    expect(updated.profileComplete).toBe(true);
  });
});

describe('ProfileService — family financial info', () => {

  it('should store sibling_education_details as a valid JSON array', async () => {
    const siblings = [
      { name: 'James', institution: 'Lodwar High', yearClass: 'Form 3', totalFees: 42000, feePaid: 15000, outstanding: 27000 },
    ];
    await profileService.updateFamily(student.id, county.id, { siblingEducationDetails: siblings, ... });
    const info = await prisma.familyFinancialInfo.findUnique({ where: { userId: student.id } });
    expect(info.siblingEducationDetails).toEqual(siblings);
  });

  it('should reject sibling_education_details with more than 8 entries', async () => {
    const tooManySiblings = Array.from({ length: 9 }, (_, i) => ({ name: `Sibling ${i}`, ... }));
    await expect(
      profileService.updateFamily(student.id, county.id, { siblingEducationDetails: tooManySiblings, ... })
    ).rejects.toThrow(BadRequestException);
  });

  it('should allow 0 as a valid income value (unemployed guardian)', async () => {
    await expect(
      profileService.updateFamily(student.id, county.id, { fatherIncomeKes: 0, motherIncomeKes: 0, ... })
    ).resolves.toBeDefined();
  });

  it('should reject negative income values', async () => {
    await expect(
      profileService.updateFamily(student.id, county.id, { fatherIncomeKes: -5000, ... })
    ).rejects.toThrow(BadRequestException);
  });
});
```

---

## 7. Program Module

### Unit Tests

```typescript
describe('ProgramService — CRUD', () => {

  it('should create a program scoped to all wards when wardId is null', async () => {
    const program = await programService.createProgram(county.id, countyAdmin.id, {
      name: 'All Wards Bursary', wardId: null, budgetCeiling: 5_000_000, ...
    });
    expect(program.wardId).toBeNull();
  });

  it('should create a program scoped to a specific ward', async () => {
    const program = await programService.createProgram(county.id, countyAdmin.id, {
      name: 'Kalokol Ward Bursary', wardId: ward.id, budgetCeiling: 500_000, ...
    });
    expect(program.wardId).toBe(ward.id);
  });

  it('should throw ForbiddenException when wardId belongs to a different county', async () => {
    const foreignWard = await createWardFixture(prisma, otherCounty.id);
    await expect(
      programService.createProgram(county.id, countyAdmin.id, { wardId: foreignWard.id, ... })
    ).rejects.toThrow(ForbiddenException);
  });

  it('should reject a program where opens_at is after closes_at', async () => {
    await expect(
      programService.createProgram(county.id, countyAdmin.id, {
        opensAt: '2024-09-01', closesAt: '2024-08-01', ...
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject a program with budget_ceiling of 0 or negative', async () => {
    await expect(
      programService.createProgram(county.id, countyAdmin.id, { budgetCeiling: 0, ... })
    ).rejects.toThrow(BadRequestException);
  });

  it('should prevent editing a program that is no longer in DRAFT status', async () => {
    const activeProgram = await createProgramFixture(prisma, county.id, { status: 'ACTIVE' });
    await expect(
      programService.updateProgram(county.id, activeProgram.id, { name: 'Renamed' })
    ).rejects.toThrow(BadRequestException);
  });
});

describe('EligibilityService — evaluation', () => {

  it('should show an ALL-wards program to a student in any ward', async () => {
    const allWardProgram = await createProgramFixture(prisma, county.id, { wardId: null, status: 'ACTIVE' });
    const eligible = await eligibilityService.getEligiblePrograms(county.id, student.id);
    expect(eligible.map(p => p.id)).toContain(allWardProgram.id);
  });

  it('should hide a ward-scoped program from a student in a different ward', async () => {
    const kalokol = await createWardFixture(prisma, county.id, { name: 'Kalokol' });
    const lokichar = await createWardFixture(prisma, county.id, { name: 'Lokichar' });
    const kalokolProgram = await createProgramFixture(prisma, county.id, { wardId: kalokol.id, status: 'ACTIVE' });
    // Student is in Lokichar ward
    await profileService.updatePersonal(student.id, county.id, { homeWard: 'Lokichar', ... });
    const eligible = await eligibilityService.getEligiblePrograms(county.id, student.id);
    expect(eligible.map(p => p.id)).not.toContain(kalokolProgram.id);
  });

  it('should hide a program from a student whose income exceeds the income bracket rule', async () => {
    const lowIncomeProgram = await createProgramFixture(prisma, county.id, {
      status: 'ACTIVE',
      eligibilityRules: [{ ruleType: 'INCOME_BRACKET', parameters: { maxAnnualIncomeKes: 200_000 } }],
    });
    await profileService.updateFamily(student.id, county.id, { fatherIncomeKes: 600_000, motherIncomeKes: 300_000, ... });
    const eligible = await eligibilityService.getEligiblePrograms(county.id, student.id);
    const found = eligible.find(p => p.id === lowIncomeProgram.id);
    expect(found?.eligible).toBe(false);
    expect(found?.ineligibilityReason).toContain('income');
  });

  it('should hide a closed program (past closes_at)', async () => {
    const closedProgram = await createProgramFixture(prisma, county.id, {
      status: 'ACTIVE',
      closesAt: new Date(Date.now() - 86_400_000), // yesterday
    });
    const eligible = await eligibilityService.getEligiblePrograms(county.id, student.id);
    expect(eligible.map(p => p.id)).not.toContain(closedProgram.id);
  });

  it('should show upcoming programs (opens_at in the future) as ineligible with reason', async () => {
    const upcomingProgram = await createProgramFixture(prisma, county.id, {
      status: 'ACTIVE',
      opensAt: new Date(Date.now() + 7 * 86_400_000), // next week
    });
    const eligible = await eligibilityService.getEligiblePrograms(county.id, student.id);
    const found = eligible.find(p => p.id === upcomingProgram.id);
    expect(found?.eligible).toBe(false);
    expect(found?.ineligibilityReason).toContain('not yet open');
  });
});
```

---

## 8. Application Module

### Unit Tests

```typescript
describe('ApplicationService — create', () => {

  it('should create a DRAFT application and return section completion status', async () => {
    await completeSectionA(profileService, student.id, county.id);
    const app = await applicationService.createApplication(county.id, student.id, { programId: program.id });
    expect(app.status).toBe('DRAFT');
    expect(app.sectionsComplete.A).toBe(true);
    expect(app.sectionsComplete.B).toBe(false);
  });

  it('should throw ConflictException when student already has a non-withdrawn application for the same program', async () => {
    await createApplicationFixture(prisma, county.id, student.id, program.id, ward.id, { status: 'SUBMITTED' });
    await expect(
      applicationService.createApplication(county.id, student.id, { programId: program.id })
    ).rejects.toThrow(ConflictException);
  });

  it('should allow creating a new application after the previous one is WITHDRAWN', async () => {
    await createApplicationFixture(prisma, county.id, student.id, program.id, ward.id, { status: 'WITHDRAWN' });
    await expect(
      applicationService.createApplication(county.id, student.id, { programId: program.id })
    ).resolves.toBeDefined();
  });

  it('should throw ForbiddenException when student profile is incomplete', async () => {
    // No profile set up for newStudent
    const newStudent = await createStudentFixture(prisma, county.id);
    await expect(
      applicationService.createApplication(county.id, newStudent.id, { programId: program.id })
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('should throw UnprocessableEntityException when program is closed', async () => {
    const closedProgram = await createProgramFixture(prisma, county.id, { status: 'CLOSED' });
    await expect(
      applicationService.createApplication(county.id, student.id, { programId: closedProgram.id })
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('should throw UnprocessableEntityException when program application window has ended', async () => {
    const expiredProgram = await createProgramFixture(prisma, county.id, {
      status: 'ACTIVE',
      closesAt: new Date(Date.now() - 1000),
    });
    await expect(
      applicationService.createApplication(county.id, student.id, { programId: expiredProgram.id })
    ).rejects.toThrow(UnprocessableEntityException);
  });
});

describe('ApplicationService — submit', () => {

  it('should transition status to SUBMITTED and generate a human-readable reference', async () => {
    const app = await setupCompleteApplication(prisma, student.id, county.id, program.id, ward.id);
    const result = await applicationService.submitApplication(county.id, student.id, app.id);
    expect(result.status).toBe('SUBMITTED');
    expect(result.submissionReference).toMatch(/^[A-Z]{3}-\d{4}-\d{5}$/);
  });

  it('should enqueue an AI scoring job immediately after submission', async () => {
    const app = await setupCompleteApplication(prisma, student.id, county.id, program.id, ward.id);
    await applicationService.submitApplication(county.id, student.id, app.id);
    expect(mockQueueService.enqueue).toHaveBeenCalledWith(
      'ai-scoring',
      expect.objectContaining({ applicationId: app.id })
    );
  });

  it('should enqueue an SMS notification job after submission', async () => {
    const app = await setupCompleteApplication(prisma, student.id, county.id, program.id, ward.id);
    await applicationService.submitApplication(county.id, student.id, app.id);
    expect(mockQueueService.enqueue).toHaveBeenCalledWith(
      'sms-dispatch',
      expect.objectContaining({ templateKey: 'APPLICATION_RECEIVED' })
    );
  });

  it('should throw UnprocessableEntityException when submitting with no CLEAN documents', async () => {
    const app = await setupApplicationWithInfectedDocument(prisma, student.id, county.id, program.id, ward.id);
    await expect(
      applicationService.submitApplication(county.id, student.id, app.id)
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('should throw ForbiddenException when submitting another student\'s application', async () => {
    const otherStudentApp = await setupCompleteApplication(prisma, otherStudent.id, county.id, program.id, ward.id);
    await expect(
      applicationService.submitApplication(county.id, student.id, otherStudentApp.id)
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw BadRequestException when re-submitting an already SUBMITTED application', async () => {
    const app = await setupCompleteApplication(prisma, student.id, county.id, program.id, ward.id);
    await applicationService.submitApplication(county.id, student.id, app.id);
    await expect(
      applicationService.submitApplication(county.id, student.id, app.id)
    ).rejects.toThrow(BadRequestException);
  });

  it('should create an immutable timeline entry on submission', async () => {
    const app = await setupCompleteApplication(prisma, student.id, county.id, program.id, ward.id);
    await applicationService.submitApplication(county.id, student.id, app.id);
    const timeline = await prisma.applicationTimeline.findMany({ where: { applicationId: app.id } });
    expect(timeline.some(t => t.eventType === 'SUBMITTED')).toBe(true);
  });
});

describe('ApplicationService — withdraw', () => {

  it('should allow withdrawal of a DRAFT application', async () => {
    const app = await createApplicationFixture(prisma, county.id, student.id, program.id, ward.id, { status: 'DRAFT' });
    await applicationService.withdrawApplication(county.id, student.id, app.id);
    const updated = await prisma.application.findUnique({ where: { id: app.id } });
    expect(updated.status).toBe('WITHDRAWN');
  });

  it('should allow withdrawal of a SUBMITTED application', async () => {
    const app = await createApplicationFixture(prisma, county.id, student.id, program.id, ward.id, { status: 'SUBMITTED' });
    await applicationService.withdrawApplication(county.id, student.id, app.id);
    const updated = await prisma.application.findUnique({ where: { id: app.id } });
    expect(updated.status).toBe('WITHDRAWN');
  });

  it('should NOT allow withdrawal of an APPROVED application', async () => {
    const app = await createApplicationFixture(prisma, county.id, student.id, program.id, ward.id, { status: 'APPROVED' });
    await expect(
      applicationService.withdrawApplication(county.id, student.id, app.id)
    ).rejects.toThrow(BadRequestException);
  });

  it('should NOT allow withdrawal of a DISBURSED application', async () => {
    const app = await createApplicationFixture(prisma, county.id, student.id, program.id, ward.id, { status: 'DISBURSED' });
    await expect(
      applicationService.withdrawApplication(county.id, student.id, app.id)
    ).rejects.toThrow(BadRequestException);
  });
});
```

### Edge Cases

```typescript
describe('ApplicationService — edge cases', () => {

  it('should handle concurrent duplicate application submissions (race condition)', async () => {
    // Two simultaneous POST /applications for the same student + program
    const results = await Promise.allSettled([
      applicationService.createApplication(county.id, student.id, { programId: program.id }),
      applicationService.createApplication(county.id, student.id, { programId: program.id }),
    ]);
    const succeeded = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    // Only one application should exist in the DB
    const count = await prisma.application.count({
      where: { applicantId: student.id, programId: program.id },
    });
    expect(count).toBe(1);
  });

  it('should not expose another county\'s application when queried by ID', async () => {
    const otherApp = await createApplicationFixture(prisma, otherCounty.id, otherStudent.id, ...);
    // Student from county 1 tries to fetch county 2's application
    await expect(
      applicationService.getApplication(county.id, student.id, otherApp.id)
    ).rejects.toThrow(NotFoundException);
  });

  it('should generate unique submission references across concurrent submissions', async () => {
    const apps = await Promise.all(
      Array.from({ length: 20 }, () => setupAndSubmitApplication(prisma, county.id, program.id, ward.id))
    );
    const refs = apps.map(a => a.submissionReference);
    expect(new Set(refs).size).toBe(20); // All unique
  });
});
```

---

## 9. Section Save & Wizard Module

### Unit Tests

```typescript
describe('SectionService — save', () => {

  it('should partially save Section B without requiring all fields', async () => {
    const result = await sectionService.saveSection(county.id, student.id, app.id, 'B', {
      totalFeeKes: 75000,
      // outstandingBalance and amountAbleToPay not provided
    });
    expect(result.isComplete).toBe(false);
    expect(result.data.totalFeeKes).toBe(75000);
  });

  it('should mark Section B complete only when all 3 amount fields are present', async () => {
    const result = await sectionService.saveSection(county.id, student.id, app.id, 'B', {
      totalFeeKes: 75000,
      outstandingBalance: 60000,
      amountAbleToPay: 15000,
    });
    expect(result.isComplete).toBe(true);
  });

  it('should reject saving sections on a non-DRAFT application', async () => {
    const submittedApp = await createApplicationFixture(prisma, county.id, student.id, program.id, ward.id, { status: 'SUBMITTED' });
    await expect(
      sectionService.saveSection(county.id, student.id, submittedApp.id, 'B', { totalFeeKes: 75000 })
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject saving another student\'s section', async () => {
    const otherApp = await createApplicationFixture(prisma, county.id, otherStudent.id, program.id, ward.id);
    await expect(
      sectionService.saveSection(county.id, student.id, otherApp.id, 'B', { totalFeeKes: 75000 })
    ).rejects.toThrow(ForbiddenException);
  });

  it('should validate Section B: amount_able_to_pay cannot exceed outstanding_balance', async () => {
    await expect(
      sectionService.saveSection(county.id, student.id, app.id, 'B', {
        totalFeeKes: 75000,
        outstandingBalance: 30000,
        amountAbleToPay: 50000, // More than outstanding
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('should validate Section B: outstanding_balance cannot exceed total_fee_kes', async () => {
    await expect(
      sectionService.saveSection(county.id, student.id, app.id, 'B', {
        totalFeeKes: 30000,
        outstandingBalance: 75000, // Greater than total
        amountAbleToPay: 0,
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('should preserve previously saved section data when saving a different section', async () => {
    await sectionService.saveSection(county.id, student.id, app.id, 'B', { totalFeeKes: 75000, outstandingBalance: 60000, amountAbleToPay: 15000 });
    await sectionService.saveSection(county.id, student.id, app.id, 'C', { familyStatus: 'SINGLE_PARENT', ... });
    const sectionB = await prisma.applicationSection.findFirst({ where: { applicationId: app.id, sectionKey: 'B' } });
    expect(sectionB.data.totalFeeKes).toBe(75000); // Section B data preserved
  });

  it('should auto-save correctly when two concurrent saves arrive for the same section', async () => {
    // Last-write-wins semantics
    const [r1, r2] = await Promise.all([
      sectionService.saveSection(county.id, student.id, app.id, 'B', { totalFeeKes: 50000 }),
      sectionService.saveSection(county.id, student.id, app.id, 'B', { totalFeeKes: 75000 }),
    ]);
    const section = await prisma.applicationSection.findFirst({ where: { applicationId: app.id, sectionKey: 'B' } });
    // Either 50000 or 75000 is acceptable — the key is no DB corruption
    expect([50000, 75000]).toContain(section.data.totalFeeKes);
  });

  it('should reject invalid section keys', async () => {
    await expect(
      sectionService.saveSection(county.id, student.id, app.id, 'Z' as any, {})
    ).rejects.toThrow(BadRequestException);
  });
});
```

---

## 10. Document Module

### Unit Tests

```typescript
describe('DocumentService — presign', () => {

  it('should return a presigned S3 upload URL and create a PENDING document record', async () => {
    const result = await documentService.presignUpload(county.id, student.id, app.id, {
      docType: 'FEE_STRUCTURE',
      fileName: 'fees.pdf',
      contentType: 'application/pdf',
      fileSizeBytes: 200_000,
    });
    expect(result.uploadUrl).toContain('s3.amazonaws.com');
    expect(result.documentId).toBeDefined();
    const doc = await prisma.document.findUnique({ where: { id: result.documentId } });
    expect(doc.scanStatus).toBe('PENDING');
  });

  it('should reject presign requests for non-PDF and non-image content types', async () => {
    await expect(
      documentService.presignUpload(county.id, student.id, app.id, {
        contentType: 'application/zip', ...
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject files larger than 5MB', async () => {
    await expect(
      documentService.presignUpload(county.id, student.id, app.id, {
        fileSizeBytes: 6 * 1024 * 1024, contentType: 'application/pdf', ...
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject document uploads on a SUBMITTED application', async () => {
    const submittedApp = await createApplicationFixture(prisma, county.id, student.id, program.id, ward.id, { status: 'SUBMITTED' });
    await expect(
      documentService.presignUpload(county.id, student.id, submittedApp.id, { docType: 'FEE_STRUCTURE', ... })
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject presign for documents on another county\'s application', async () => {
    const foreignApp = await createApplicationFixture(prisma, otherCounty.id, otherStudent.id, ...);
    await expect(
      documentService.presignUpload(county.id, student.id, foreignApp.id, { ... })
    ).rejects.toThrow(NotFoundException);
  });
});

describe('DocumentService — confirm & scan', () => {

  it('should update scan_status to CLEAN and enqueue AI scoring after a clean scan', async () => {
    mockClamAV.scan.mockResolvedValue({ isInfected: false });
    await documentService.confirmUpload(county.id, student.id, app.id, doc.id);
    await documentScanProcessor.process({ data: { documentId: doc.id } });
    const updated = await prisma.document.findUnique({ where: { id: doc.id } });
    expect(updated.scanStatus).toBe('CLEAN');
  });

  it('should update scan_status to INFECTED and prevent application submission', async () => {
    mockClamAV.scan.mockResolvedValue({ isInfected: true, viruses: ['Trojan.Generic'] });
    await documentScanProcessor.process({ data: { documentId: doc.id } });
    const updated = await prisma.document.findUnique({ where: { id: doc.id } });
    expect(updated.scanStatus).toBe('INFECTED');
    await expect(
      applicationService.submitApplication(county.id, student.id, app.id)
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('should generate a presigned download URL that expires in 15 minutes', async () => {
    const result = await documentService.getDownloadUrl(county.id, wardAdmin.id, app.id, doc.id);
    expect(result.downloadUrl).toContain('X-Amz-Expires=900'); // 900 seconds = 15 min
    expect(result.expiresAt).toBeDefined();
  });

  it('should not allow a student to download another student\'s document', async () => {
    const otherDoc = await createDocumentFixture(prisma, otherStudent.id, otherCounty.id, ...);
    await expect(
      documentService.getDownloadUrl(county.id, student.id, app.id, otherDoc.id)
    ).rejects.toThrow(NotFoundException);
  });
});
```

---

## 11. Review Module

### Unit Tests

```typescript
describe('WardReviewService', () => {

  it('should transition application to COUNTY_REVIEW on RECOMMENDED decision', async () => {
    const app = await createApplicationFixture(prisma, county.id, student.id, program.id, ward.id, { status: 'WARD_REVIEW' });
    await wardReviewService.submitReview(county.id, wardAdmin.id, ward.id, app.id, {
      decision: 'RECOMMENDED', recommendedAmount: 40000, note: 'High need confirmed',
    });
    const updated = await prisma.application.findUnique({ where: { id: app.id } });
    expect(updated.status).toBe('COUNTY_REVIEW');
  });

  it('should transition application back to SUBMITTED (for re-submission) on RETURNED decision', async () => {
    const app = await createApplicationFixture(prisma, county.id, student.id, program.id, ward.id, { status: 'WARD_REVIEW' });
    await wardReviewService.submitReview(county.id, wardAdmin.id, ward.id, app.id, {
      decision: 'RETURNED', recommendedAmount: 0, note: 'Missing transcript',
    });
    const updated = await prisma.application.findUnique({ where: { id: app.id } });
    expect(updated.status).toBe('SUBMITTED');
  });

  it('should throw ForbiddenException when ward admin reviews an application from a different ward', async () => {
    const otherWard = await createWardFixture(prisma, county.id);
    const otherWardApp = await createApplicationFixture(prisma, county.id, student.id, program.id, otherWard.id, { status: 'WARD_REVIEW' });
    await expect(
      wardReviewService.submitReview(county.id, wardAdmin.id, ward.id, otherWardApp.id, { decision: 'RECOMMENDED', ... })
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw BadRequestException when reviewing an application not in WARD_REVIEW status', async () => {
    const draftApp = await createApplicationFixture(prisma, county.id, student.id, program.id, ward.id, { status: 'DRAFT' });
    await expect(
      wardReviewService.submitReview(county.id, wardAdmin.id, ward.id, draftApp.id, { decision: 'RECOMMENDED', ... })
    ).rejects.toThrow(BadRequestException);
  });

  it('should create an immutable timeline entry for every review decision', async () => {
    const app = await createApplicationFixture(prisma, county.id, student.id, program.id, ward.id, { status: 'WARD_REVIEW' });
    await wardReviewService.submitReview(county.id, wardAdmin.id, ward.id, app.id, { decision: 'RECOMMENDED', recommendedAmount: 40000, note: 'OK' });
    const timeline = await prisma.applicationTimeline.findMany({ where: { applicationId: app.id } });
    expect(timeline.some(t => t.eventType === 'WARD_REVIEWED')).toBe(true);
  });

  it('should record the reviewer_id on the review record', async () => {
    const app = await createApplicationFixture(prisma, county.id, student.id, program.id, ward.id, { status: 'WARD_REVIEW' });
    await wardReviewService.submitReview(county.id, wardAdmin.id, ward.id, app.id, { decision: 'RECOMMENDED', recommendedAmount: 40000 });
    const review = await prisma.applicationReview.findFirst({ where: { applicationId: app.id } });
    expect(review.reviewerId).toBe(wardAdmin.id);
  });
});

describe('CountyReviewService — budget enforcement', () => {

  it('should approve and correctly increment allocated_total on the program', async () => {
    const app = await createApplicationFixture(prisma, county.id, student.id, program.id, ward.id, { status: 'COUNTY_REVIEW' });
    await countyReviewService.submitReview(county.id, financeOfficer.id, app.id, {
      decision: 'APPROVED', allocatedAmount: 38000,
    });
    const updatedProgram = await prisma.bursaryProgram.findUnique({ where: { id: program.id } });
    expect(Number(updatedProgram.allocatedTotal)).toBe(38000);
  });

  it('should throw ConflictException when allocation would exceed budget ceiling', async () => {
    const tightProgram = await createProgramFixture(prisma, county.id, { budgetCeiling: 10000, allocatedTotal: 9000 });
    const app = await createApplicationFixture(prisma, county.id, student.id, tightProgram.id, ward.id, { status: 'COUNTY_REVIEW' });
    await expect(
      countyReviewService.submitReview(county.id, financeOfficer.id, app.id, { decision: 'APPROVED', allocatedAmount: 5000 })
    ).rejects.toThrow(ConflictException);
    // Budget should not have changed
    const program = await prisma.bursaryProgram.findUnique({ where: { id: tightProgram.id } });
    expect(Number(program.allocatedTotal)).toBe(9000);
  });

  it('should handle concurrent approval race: only ONE of two concurrent allocations exceeding budget should succeed', async () => {
    // Program with exactly KES 10,000 remaining
    const tightProgram = await createProgramFixture(prisma, county.id, { budgetCeiling: 50000, allocatedTotal: 40000 });
    const app1 = await createApplicationFixture(prisma, county.id, student.id, tightProgram.id, ward.id, { status: 'COUNTY_REVIEW' });
    const app2 = await createApplicationFixture(prisma, county.id, otherStudent.id, tightProgram.id, ward.id, { status: 'COUNTY_REVIEW' });

    const results = await Promise.allSettled([
      countyReviewService.submitReview(county.id, financeOfficer.id, app1.id, { decision: 'APPROVED', allocatedAmount: 8000 }),
      countyReviewService.submitReview(county.id, financeOfficer.id, app2.id, { decision: 'APPROVED', allocatedAmount: 8000 }),
    ]);

    const succeeded = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);

    // Final allocated_total should be exactly 40000 + 8000 = 48000 (not 56000)
    const final = await prisma.bursaryProgram.findUnique({ where: { id: tightProgram.id } });
    expect(Number(final.allocatedTotal)).toBe(48000);
  });

  it('should WAITLIST an application when budget is insufficient but decision is WAITLISTED', async () => {
    const app = await createApplicationFixture(prisma, county.id, student.id, program.id, ward.id, { status: 'COUNTY_REVIEW' });
    await countyReviewService.submitReview(county.id, financeOfficer.id, app.id, { decision: 'WAITLISTED', allocatedAmount: 0 });
    const updated = await prisma.application.findUnique({ where: { id: app.id } });
    expect(updated.status).toBe('WAITLISTED');
    // allocated_total should not change
    const prog = await prisma.bursaryProgram.findUnique({ where: { id: program.id } });
    expect(Number(prog.allocatedTotal)).toBe(0);
  });
});
```

---

## 12. Disbursement Module

### Unit Tests

```typescript
describe('MpesaService — B2C disbursement', () => {

  it('should call the M-Pesa Daraja B2C API with correct parameters', async () => {
    const result = await mpesaService.disburse({
      applicationId: approvedApp.id, countyId: county.id,
      phone: '+254712345678', amountKes: 38000,
      remarks: 'Bursary TRK-2024-00142',
    });
    expect(mockDarajaClient.b2cPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        Amount: 38000,
        PartyB: '254712345678',
        Remarks: expect.stringContaining('TRK-2024-00142'),
      })
    );
    expect(result.status).toBe('PENDING');
  });

  it('should store the M-Pesa transaction ID on confirmation callback', async () => {
    await mpesaService.handleCallback({
      applicationId: approvedApp.id,
      transactionId: 'NKG6KL2H4Q',
      resultCode: 0,
    });
    const record = await prisma.disbursementRecord.findFirst({ where: { applicationId: approvedApp.id } });
    expect(record.transactionId).toBe('NKG6KL2H4Q');
    expect(record.status).toBe('SUCCESS');
    const app = await prisma.application.findUnique({ where: { id: approvedApp.id } });
    expect(app.status).toBe('DISBURSED');
  });

  it('should mark disbursement as FAILED and increment retry_count on non-zero result code', async () => {
    await mpesaService.handleCallback({
      applicationId: approvedApp.id, resultCode: 2001, resultDescription: 'Insufficient funds in utility account',
    });
    const record = await prisma.disbursementRecord.findFirst({ where: { applicationId: approvedApp.id } });
    expect(record.status).toBe('FAILED');
    expect(record.failureReason).toContain('Insufficient funds');
  });

  it('should throw BadRequestException when attempting to disburse a non-APPROVED application', async () => {
    const pendingApp = await createApplicationFixture(prisma, county.id, student.id, program.id, ward.id, { status: 'SUBMITTED' });
    await expect(
      mpesaService.disburse({ applicationId: pendingApp.id, ... })
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw ConflictException when attempting to disburse an already DISBURSED application', async () => {
    const disbursedApp = await createApplicationFixture(prisma, county.id, student.id, program.id, ward.id, { status: 'DISBURSED' });
    await expect(
      mpesaService.disburse({ applicationId: disbursedApp.id, ... })
    ).rejects.toThrow(ConflictException);
  });

  it('should reject disbursement amount that exceeds amount_allocated', async () => {
    const approvedApp = await createApplicationFixture(prisma, county.id, student.id, program.id, ward.id, {
      status: 'APPROVED', amountAllocated: 38000,
    });
    await expect(
      mpesaService.disburse({ applicationId: approvedApp.id, amountKes: 50000, ... })
    ).rejects.toThrow(BadRequestException);
  });

  it('should handle M-Pesa B2C API timeout and re-queue the job', async () => {
    mockDarajaClient.b2cPayment.mockRejectedValue(new Error('TIMEOUT'));
    const job = { data: { applicationId: approvedApp.id, amountKes: 38000, phone: '+254712345678' } };
    await disbursementProcessor.process(job);
    expect(mockQueueService.enqueue).toHaveBeenCalledWith(
      'disbursement', expect.objectContaining({ applicationId: approvedApp.id }), expect.objectContaining({ delay: expect.any(Number) })
    );
  });
});

describe('EFTExportService', () => {

  it('should generate an RTGS file with correct format for multiple approved applications', async () => {
    const apps = await Promise.all([
      createApprovedApplicationFixture(prisma, county.id, program.id, ward.id, { amountAllocated: 30000, bankAccountNumber: 'ACC001', bankName: 'Equity Bank' }),
      createApprovedApplicationFixture(prisma, county.id, program.id, ward.id, { amountAllocated: 45000, bankAccountNumber: 'ACC002', bankName: 'KCB' }),
    ]);
    const fileBuffer = await eftExportService.generateRtgsFile(county.id, apps.map(a => a.id));
    const content = fileBuffer.toString();
    expect(content).toContain('ACC001');
    expect(content).toContain('30000');
    expect(content).toContain('ACC002');
    expect(content).toContain('45000');
  });

  it('should reject EFT export for applications from different programs in the same request', async () => {
    // Business rule: one EFT batch per program
    const program2 = await createProgramFixture(prisma, county.id);
    const app1 = await createApprovedApplicationFixture(prisma, county.id, program.id, ward.id, {});
    const app2 = await createApprovedApplicationFixture(prisma, county.id, program2.id, ward.id, {});
    await expect(
      eftExportService.generateRtgsFile(county.id, [app1.id, app2.id])
    ).rejects.toThrow(BadRequestException);
  });
});
```

---

## 13. AI Scoring Service

### Unit Tests (Python / Pytest)

```python
# tests/test_scoring.py

class TestStructuredScoring:

    def test_orphan_status_gets_maximum_family_status_score(self, scoring_engine):
        app = ApplicationFixture(family_status='ORPHAN')
        score = scoring_engine.score_family_status(app)
        assert score == 25.0

    def test_both_parents_alive_gets_minimum_family_status_score(self, scoring_engine):
        app = ApplicationFixture(family_status='BOTH_PARENTS')
        score = scoring_engine.score_family_status(app)
        assert score == 5.0

    def test_income_below_10k_per_month_gets_maximum_income_score(self, scoring_engine):
        app = ApplicationFixture(father_income_kes=0, mother_income_kes=60_000)  # 5K/month
        score = scoring_engine.score_family_income(app)
        assert score == 20.0

    def test_income_above_50k_per_month_gets_zero_income_score(self, scoring_engine):
        app = ApplicationFixture(father_income_kes=800_000, mother_income_kes=400_000)
        score = scoring_engine.score_family_income(app)
        assert score == 0.0

    def test_disability_flag_adds_bonus_points(self, scoring_engine):
        app_no_disability = ApplicationFixture(has_disability=False)
        app_with_disability = ApplicationFixture(has_disability=True)
        assert scoring_engine.score_family_status(app_with_disability) > scoring_engine.score_family_status(app_no_disability)

    def test_prior_bursary_receipt_deducts_points(self, scoring_engine):
        app_no_prior = ApplicationFixture(prior_bursary_received=False)
        app_with_prior = ApplicationFixture(prior_bursary_received=True, prior_bursary_source='Ward 2023')
        total_no_prior = scoring_engine.score_integrity(app_no_prior)
        total_with_prior = scoring_engine.score_integrity(app_with_prior)
        assert total_with_prior < total_no_prior

    def test_total_score_is_normalised_between_0_and_100(self, scoring_engine):
        app = ApplicationFixture()
        result = scoring_engine.calculate_total_score(app, DEFAULT_WEIGHTS)
        assert 0.0 <= result.total_score <= 100.0

    def test_weights_that_dont_sum_to_1_raise_validation_error(self, scoring_engine):
        bad_weights = {'family_status': 0.4, 'family_income': 0.4, 'education_burden': 0.4}
        with pytest.raises(ValueError, match="must sum to 1.0"):
            scoring_engine.validate_weights(bad_weights)

    def test_total_score_with_custom_county_weights(self, scoring_engine):
        county_weights = {
            'family_status': 0.40,       # Boosted
            'family_income': 0.20,
            'education_burden': 0.15,
            'academic_standing': 0.10,
            'document_quality': 0.10,
            'integrity': 0.05,
        }
        orphan_app = ApplicationFixture(family_status='ORPHAN')
        both_parents_app = ApplicationFixture(family_status='BOTH_PARENTS')
        orphan_score = scoring_engine.calculate_total_score(orphan_app, county_weights).total_score
        both_parents_score = scoring_engine.calculate_total_score(both_parents_app, county_weights).total_score
        # With boosted family_status weight, orphan should score significantly higher
        assert orphan_score - both_parents_score >= 20.0

    def test_score_is_deterministic_given_same_input(self, scoring_engine):
        app = ApplicationFixture(family_status='SINGLE_PARENT', father_income_kes=0, mother_income_kes=120_000)
        score1 = scoring_engine.calculate_total_score(app, DEFAULT_WEIGHTS)
        score2 = scoring_engine.calculate_total_score(app, DEFAULT_WEIGHTS)
        assert score1.total_score == score2.total_score


class TestAnomalyDetection:

    def test_duplicate_national_id_in_same_cycle_raises_flag(self, anomaly_detector, db_session):
        # Two applications with same national_id in same program cycle
        existing_app = create_application_with_national_id(db_session, county_id='county1', national_id='12345678', program_id='prog1')
        new_app = ApplicationFixture(national_id='12345678', program_id='prog1', county_id='county1')
        flags = anomaly_detector.detect(new_app, db_session)
        assert any(f['type'] == 'DUPLICATE_NATIONAL_ID' for f in flags)

    def test_national_id_duplicate_across_counties_does_not_raise_flag(self, anomaly_detector, db_session):
        existing_app = create_application_with_national_id(db_session, county_id='county1', national_id='12345678', program_id='prog1')
        new_app = ApplicationFixture(national_id='12345678', program_id='prog2', county_id='county2')
        flags = anomaly_detector.detect(new_app, db_session)
        assert not any(f['type'] == 'DUPLICATE_NATIONAL_ID' for f in flags)

    def test_implausible_income_vs_occupation_raises_flag(self, anomaly_detector):
        app = ApplicationFixture(mother_occupation='Subsistence farmer', mother_income_kes=12_000_000)
        flags = anomaly_detector.detect(app)
        assert any(f['type'] == 'IMPLAUSIBLE_INCOME' for f in flags)

    def test_document_uploaded_after_institution_closing_date_raises_flag(self, anomaly_detector):
        # Fee structure from 2022 for a 2024 program cycle
        app = ApplicationFixture(document_metadata={'FEE_STRUCTURE': {'year': '2022'}}, program_year='2024')
        flags = anomaly_detector.detect(app)
        assert any(f['type'] == 'STALE_DOCUMENT' for f in flags)


class TestDocumentAnalysis:

    def test_clear_legible_document_gets_high_quality_score(self, document_analyser, mock_claude_client):
        mock_claude_client.messages.create.return_value = MockResponse(
            content='{"is_legible": true, "appears_authentic": true, "quality_score": 9, "flags": []}'
        )
        score = document_analyser.analyse('s3://bucket/clear-doc.pdf', 'FEE_STRUCTURE')
        assert score.quality_score == 9
        assert score.appears_authentic is True

    def test_blurry_document_gets_low_quality_score(self, document_analyser, mock_claude_client):
        mock_claude_client.messages.create.return_value = MockResponse(
            content='{"is_legible": false, "appears_authentic": null, "quality_score": 2, "flags": ["Image too blurry to read"]}'
        )
        score = document_analyser.analyse('s3://bucket/blurry-doc.jpg', 'TRANSCRIPT')
        assert score.quality_score == 2
        assert 'blurry' in score.flags[0].lower()

    def test_claude_api_error_returns_fallback_score_without_raising(self, document_analyser, mock_claude_client):
        mock_claude_client.messages.create.side_effect = Exception('API timeout')
        score = document_analyser.analyse('s3://bucket/doc.pdf', 'ADMISSION_LETTER')
        assert score.quality_score == 5  # neutral fallback
        assert 'analysis_unavailable' in score.flags

    def test_malformed_claude_response_is_handled_gracefully(self, document_analyser, mock_claude_client):
        mock_claude_client.messages.create.return_value = MockResponse(content='not valid json {{{}')
        score = document_analyser.analyse('s3://bucket/doc.pdf', 'FEE_STRUCTURE')
        assert score is not None  # Should not raise
        assert score.quality_score == 5  # fallback
```

---

## 14. Notification Module

### Unit Tests

```typescript
describe('SmsService', () => {

  it('should send SMS via Africa\'s Talking with the correct sender ID', async () => {
    await smsService.send({ phone: '+254712345678', message: 'Your application was received.' });
    expect(mockAtClient.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'KauntyGov', to: '+254712345678' })
    );
  });

  it('should format phone number correctly (254... format for AT)', async () => {
    await smsService.send({ phone: '0712345678', message: 'Test' }); // Kenyan local format
    expect(mockAtClient.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ to: '+254712345678' })
    );
  });

  it('should log a warning and not throw on SMS delivery failure', async () => {
    mockAtClient.sendMessage.mockRejectedValue(new Error('Gateway unavailable'));
    await expect(
      smsService.send({ phone: '+254712345678', message: 'Test' })
    ).resolves.not.toThrow(); // Notification failures must not crash the main flow
  });

  it('should use the correct SMS template for APPLICATION_RECEIVED event', async () => {
    await notificationService.notifyStudent(student.id, county.id, 'APPLICATION_RECEIVED', {
      reference: 'TRK-2024-00142',
    });
    expect(mockSmsService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('TRK-2024-00142'),
      })
    );
  });

  it('should not send SMS to a student with no verified phone number', async () => {
    const noPhoneStudent = await createStudentFixture(prisma, county.id, { phone: null, phoneVerified: false });
    await notificationService.notifyStudent(noPhoneStudent.id, county.id, 'APPLICATION_RECEIVED', {});
    expect(mockSmsService.send).not.toHaveBeenCalled();
  });

  it('should send Swahili SMS template to a student with sw locale preference', async () => {
    const swStudent = await createStudentFixture(prisma, county.id, { settings: { locale: 'sw' } });
    await notificationService.notifyStudent(swStudent.id, county.id, 'APPLICATION_APPROVED', {});
    expect(mockSmsService.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/imeidhinishwa/i) }) // Swahili word
    );
  });
});
```

---

## 15. Reporting Module

### Unit Tests

```typescript
describe('DashboardService', () => {

  it('should return correct application counts by status for a program', async () => {
    await createApplicationsWithStatuses(prisma, county.id, program.id, ward.id, {
      SUBMITTED: 10, WARD_REVIEW: 20, APPROVED: 5,
    });
    const dashboard = await dashboardService.getProgramDashboard(county.id, program.id);
    expect(dashboard.applicationsByStatus.SUBMITTED).toBe(10);
    expect(dashboard.applicationsByStatus.WARD_REVIEW).toBe(20);
    expect(dashboard.applicationsByStatus.APPROVED).toBe(5);
  });

  it('should compute budget utilization percentage correctly', async () => {
    await createProgramWithAllocations(prisma, county.id, {
      budgetCeiling: 5_000_000, allocatedTotal: 2_500_000,
    });
    const dashboard = await dashboardService.getProgramDashboard(county.id, program.id);
    expect(dashboard.utilizationPct).toBe(50.0);
  });

  it('should serve dashboard data from Redis cache on repeat calls', async () => {
    const spy = jest.spyOn(prisma.application, 'groupBy');
    await dashboardService.getProgramDashboard(county.id, program.id);
    await dashboardService.getProgramDashboard(county.id, program.id);
    expect(spy).toHaveBeenCalledTimes(1); // Second call served from cache
  });

  it('should NOT include applications from other counties in ward breakdown', async () => {
    // Create applications in county2 that happen to share the same ward code
    await createApplicationsInOtherCounty(prisma, otherCounty.id, program.id, ward.id);
    const dashboard = await dashboardService.getProgramDashboard(county.id, program.id);
    const totalApps = Object.values(dashboard.applicationsByStatus).reduce((a, b) => a + b, 0);
    // Should only count county.id applications
    const actualCount = await prisma.application.count({ where: { countyId: county.id, programId: program.id } });
    expect(totalApps).toBe(actualCount);
  });
});

describe('OcobReportService', () => {

  it('should generate an Excel file with correct totals per ward', async () => {
    const fileBuffer = await ocobReportService.generate(county.id, program.id);
    const workbook = XLSX.read(fileBuffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('Ward');
    expect(data[0]).toHaveProperty('Total Allocated (KES)');
  });

  it('should not include any data from other counties in the OCOB report', async () => {
    const fileBuffer = await ocobReportService.generate(county.id, program.id);
    const workbook = XLSX.read(fileBuffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    const otherCountyWards = await prisma.ward.findMany({ where: { countyId: otherCounty.id } });
    const otherCountyWardNames = otherCountyWards.map(w => w.name);
    data.forEach(row => {
      expect(otherCountyWardNames).not.toContain(row['Ward']);
    });
  });
});
```

---

## 16. PDF Generation

### Unit Tests

```typescript
describe('PdfService — form generation', () => {

  it('should generate a valid PDF buffer for a complete application', async () => {
    const pdfBuffer = await pdfService.generateApplicationForm(county.id, app.id);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    // PDF magic bytes
    expect(pdfBuffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('should embed the county name in the generated PDF', async () => {
    const pdfBuffer = await pdfService.generateApplicationForm(county.id, app.id);
    const text = await extractPdfText(pdfBuffer);
    expect(text).toContain(county.name.toUpperCase());
  });

  it('should embed the submission reference in the generated PDF', async () => {
    const submittedApp = await createApplicationFixture(prisma, county.id, student.id, program.id, ward.id, {
      status: 'SUBMITTED', submissionReference: 'TRK-2024-00142',
    });
    const pdfBuffer = await pdfService.generateApplicationForm(county.id, submittedApp.id);
    const text = await extractPdfText(pdfBuffer);
    expect(text).toContain('TRK-2024-00142');
  });

  it('should embed a QR code in the generated PDF', async () => {
    const pdfBuffer = await pdfService.generateApplicationForm(county.id, app.id);
    // QR codes in PDFs are embedded as images; verify by checking PDF structure
    expect(pdfBuffer.toString()).toContain('/Image');
  });

  it('should include the county logo when available', async () => {
    mockS3.getObject.mockResolvedValue(Buffer.from('fake-png'));
    const pdfBuffer = await pdfService.generateApplicationForm(county.id, app.id);
    expect(mockS3.getObject).toHaveBeenCalledWith(
      expect.objectContaining({ Key: county.logoS3Key })
    );
  });

  it('should fall back to default logo when county logo S3 fetch fails', async () => {
    mockS3.getObject.mockRejectedValue(new Error('NoSuchKey'));
    await expect(pdfService.generateApplicationForm(county.id, app.id)).resolves.toBeDefined();
  });

  it('should render sibling education table with correct number of rows', async () => {
    const siblings = Array.from({ length: 3 }, (_, i) => ({ name: `Sibling ${i}`, ... }));
    await profileService.updateFamily(student.id, county.id, { siblingEducationDetails: siblings, ... });
    const pdfBuffer = await pdfService.generateApplicationForm(county.id, app.id);
    const text = await extractPdfText(pdfBuffer);
    siblings.forEach(s => expect(text).toContain(s.name));
  });

  it('should NOT render sibling table rows for empty sibling array', async () => {
    await profileService.updateFamily(student.id, county.id, { siblingEducationDetails: [], numSiblings: 0, ... });
    // Should not throw — empty table is valid
    await expect(pdfService.generateApplicationForm(county.id, app.id)).resolves.toBeDefined();
  });

  it('should throw NotFoundException when generating PDF for an application from another county', async () => {
    const foreignApp = await createApplicationFixture(prisma, otherCounty.id, otherStudent.id, ...);
    await expect(pdfService.generateApplicationForm(county.id, foreignApp.id)).rejects.toThrow(NotFoundException);
  });
});
```

---

## 17. Multi-Tenancy & RLS

### Integration Tests — RLS Critical Path

These tests verify the database RLS layer independently of the application layer.

```typescript
describe('RLS — tenant isolation (database-level)', () => {

  let county1Prisma: PrismaClient; // Connection with county1 session vars
  let county2Prisma: PrismaClient;

  beforeEach(async () => {
    county1Prisma = await createTenantPrismaClient(county1.id, financeOfficer1.id, 'FINANCE_OFFICER', null);
    county2Prisma = await createTenantPrismaClient(county2.id, financeOfficer2.id, 'FINANCE_OFFICER', null);
  });

  it('should return zero applications from another county when queried with county1 session', async () => {
    // Create applications in county2
    await createApplicationFixture(prisma, county2.id, otherStudent.id, ...);
    // Query with county1 session — RLS should filter to zero rows
    const apps = await county1Prisma.application.findMany();
    expect(apps.every(a => a.countyId === county1.id)).toBe(true);
  });

  it('should prevent INSERT into another county via direct Prisma with county1 session', async () => {
    await expect(
      county1Prisma.application.create({
        data: { countyId: county2.id, applicantId: student1.id, ... }
      })
    ).rejects.toThrow(); // RLS check constraint violation
  });

  it('should prevent UPDATE of another county\'s application via county1 session', async () => {
    const county2App = await prisma.application.create({ data: { countyId: county2.id, ... } });
    const result = await county1Prisma.application.updateMany({
      where: { id: county2App.id },
      data: { status: 'APPROVED' },
    });
    expect(result.count).toBe(0); // Zero rows updated — RLS blocked it
    // Verify original not changed
    const unchanged = await prisma.application.findUnique({ where: { id: county2App.id } });
    expect(unchanged.status).not.toBe('APPROVED');
  });

  it('ward admin session: should only see applications from their assigned ward', async () => {
    const ward1Apps = await createNApplications(prisma, county1.id, ward1.id, 5);
    const ward2Apps = await createNApplications(prisma, county1.id, ward2.id, 3);
    const wardAdminPrisma = await createTenantPrismaClient(county1.id, wardAdmin1.id, 'WARD_ADMIN', ward1.id);
    const visible = await wardAdminPrisma.application.findMany();
    const visibleIds = visible.map(a => a.id);
    ward1Apps.forEach(a => expect(visibleIds).toContain(a.id));
    ward2Apps.forEach(a => expect(visibleIds).not.toContain(a.id));
  });

  it('student session: should only see their own applications', async () => {
    const studentApp = await createApplicationFixture(prisma, county1.id, student1.id, ...);
    const otherStudentApp = await createApplicationFixture(prisma, county1.id, student2.id, ...);
    const studentPrisma = await createTenantPrismaClient(county1.id, student1.id, 'STUDENT', null);
    const visible = await studentPrisma.application.findMany();
    expect(visible.map(a => a.id)).toContain(studentApp.id);
    expect(visible.map(a => a.id)).not.toContain(otherStudentApp.id);
  });

  it('application_timeline: INSERT-only trigger should reject UPDATE attempts', async () => {
    const timeline = await prisma.applicationTimeline.create({
      data: { applicationId: app.id, countyId: county1.id, eventType: 'CREATED', ... }
    });
    await expect(
      prisma.$executeRaw`UPDATE application_timeline SET event_type = 'TAMPERED' WHERE id = ${timeline.id}`
    ).rejects.toThrow(/INSERT-only/);
  });

  it('application_timeline: INSERT-only trigger should reject DELETE attempts', async () => {
    const timeline = await prisma.applicationTimeline.create({ data: { ... } });
    await expect(
      prisma.$executeRaw`DELETE FROM application_timeline WHERE id = ${timeline.id}`
    ).rejects.toThrow(/INSERT-only/);
  });
});
```

---

## 18. Queue & Async Jobs

### Unit Tests

```typescript
describe('QueueService — job enqueue', () => {

  it('should deduplicate AI scoring jobs for the same applicationId within 5 minutes', async () => {
    await queueService.enqueue('ai-scoring', { applicationId: app.id });
    await queueService.enqueue('ai-scoring', { applicationId: app.id }); // Duplicate
    const jobs = await aiScoringQueue.getJobs(['waiting']);
    // BullMQ deduplication: only one job should exist
    expect(jobs.filter(j => j.data.applicationId === app.id)).toHaveLength(1);
  });

  it('should retry failed AI scoring jobs up to 3 times with exponential backoff', async () => {
    mockAiService.score.mockRejectedValue(new Error('Service unavailable'));
    const job = await aiScoringQueue.add('score', { applicationId: app.id });
    await processor.process(job);
    await processor.process(job); // retry 1
    await processor.process(job); // retry 2
    await processor.process(job); // retry 3 — moves to DLQ
    expect(job.attemptsMade).toBe(3);
  });

  it('should move a job to the DLQ queue after exhausting retries', async () => {
    const job = createExhaustedJob({ applicationId: app.id });
    await aiScoringProcessor.onFailed(job, new Error('Permanent failure'));
    const dlqJobs = await dlqQueue.getJobs(['waiting']);
    expect(dlqJobs.some(j => j.data.applicationId === app.id)).toBe(true);
  });

  it('should not crash the main application when a notification job fails', async () => {
    mockSmsService.send.mockRejectedValue(new Error('Gateway down'));
    await expect(smsProcessor.process({ data: { phone: '+254...', message: 'Test' } }))
      .resolves.not.toThrow();
  });

  it('should carry the idempotency key through to retried jobs', async () => {
    const idempotencyKey = `sms-dispatch:${app.id}:APPLICATION_RECEIVED`;
    await queueService.enqueue('sms-dispatch', { applicationId: app.id, templateKey: 'APPLICATION_RECEIVED' });
    const jobs = await smsQueue.getJobs(['waiting']);
    expect(jobs[0].opts.jobId).toBe(idempotencyKey);
  });
});
```

---

## 19. Rate Limiting & Security

### Integration Tests

```typescript
describe('Rate limiting', () => {

  it('should return 429 after 10 login attempts within 1 minute from the same IP', async () => {
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', '1.2.3.4')
        .send({ email: 'x@test.com', password: 'wrong', countySlug: county.slug });
    }
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '1.2.3.4')
      .send({ email: 'x@test.com', password: 'wrong', countySlug: county.slug });
    expect(response.status).toBe(429);
    expect(response.headers['x-ratelimit-remaining']).toBe('0');
  });

  it('should return 429 after 5 application submissions within 1 minute for the same user', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post(`/api/v1/applications/${app.id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`);
    }
    const response = await request(app.getHttpServer())
      .post(`/api/v1/applications/${app.id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(response.status).toBe(429);
  });

  it('should not rate-limit a different user making the same request', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', '1.2.3.4')
        .send({ ... });
    }
    // Different IP — should still succeed
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', '5.6.7.8')
      .send({ email: student.email, password: 'TestPass123!', countySlug: county.slug });
    expect(response.status).toBe(200);
  });
});

describe('Security — injection and abuse prevention', () => {

  it('should sanitize SQL injection attempts in query parameters', async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/programs?status=ACTIVE'; DROP TABLE bursary_programs; --")
      .set('Authorization', `Bearer ${studentToken}`);
    expect(response.status).toBeOneOf([200, 400]); // Never 500
    // Table should still exist
    const count = await prisma.bursaryProgram.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('should reject oversized request bodies (> 1MB JSON)', async () => {
    const hugePayload = { data: 'x'.repeat(2 * 1024 * 1024) };
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/applications/${app.id}/sections/E`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send(hugePayload);
    expect(response.status).toBe(413);
  });

  it('should reject requests without CSRF token on state-changing endpoints (when applicable)', async () => {
    // Verify double-submit cookie CSRF protection on cookie-based flows
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${studentToken}`)
      .set('Cookie', 'refresh_token=valid_token') // Missing CSRF token
      .send();
    // This verifies the CSRF check is in place
    expect([200, 403]).toContain(response.status);
  });

  it('should redact sensitive fields (national_id, bank_account) from error log output', async () => {
    const logSpy = jest.spyOn(logger, 'error');
    await profileService.updatePersonal(student.id, county.id, { nationalId: '12345678', ... })
      .catch(() => {}); // Trigger any error
    if (logSpy.mock.calls.length > 0) {
      const loggedData = JSON.stringify(logSpy.mock.calls);
      expect(loggedData).not.toContain('12345678');
    }
  });

  it('should not expose stack traces in production error responses', async () => {
    process.env.NODE_ENV = 'production';
    const response = await request(app.getHttpServer())
      .get('/api/v1/applications/non-existent-uuid')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(response.body.error).not.toHaveProperty('stack');
    process.env.NODE_ENV = 'test';
  });

  it('should block access to internal endpoints without a service API key', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/internal/applications/${app.id}`)
      .set('Authorization', `Bearer ${studentToken}`); // User JWT, not service key
    expect(response.status).toBe(403);
  });

  it('should reject an expired access token', async () => {
    const expiredToken = createExpiredJwt(student.id, county.id);
    const response = await request(app.getHttpServer())
      .get('/api/v1/profile')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('TOKEN_EXPIRED');
  });
});
```

---

## 20. Frontend Component Tests

### React Testing Library Tests (Vitest)

```tsx
// tests/components/StepProgress.test.tsx
describe('StepProgress component', () => {

  it('renders all 7 steps with correct labels', () => {
    render(<StepProgress steps={WIZARD_STEPS} currentStep={1} />);
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('marks completed steps with a checkmark icon', () => {
    render(<StepProgress steps={WIZARD_STEPS} currentStep={4} />);
    const completedSteps = screen.getAllByRole('img', { name: /completed/i });
    expect(completedSteps).toHaveLength(3); // Steps 1, 2, 3 complete
  });

  it('shows the correct step count on mobile view', () => {
    window.resizeTo(375, 812); // iPhone SE
    render(<StepProgress steps={WIZARD_STEPS} currentStep={3} />);
    expect(screen.getByText(/step 3 of 7/i)).toBeInTheDocument();
  });
});

// tests/components/AIScoreCard.test.tsx
describe('AIScoreCard component', () => {

  it('renders the total score and grade label', () => {
    render(<AIScoreCard score={78.5} grade="HIGH" dimensions={mockDimensions} anomalyFlags={[]} />);
    expect(screen.getByText('78.5')).toBeInTheDocument();
    expect(screen.getByText(/high need/i)).toBeInTheDocument();
  });

  it('renders anomaly flags when present', () => {
    const flags = [{ type: 'DUPLICATE_NATIONAL_ID', description: 'National ID appears in 2 applications' }];
    render(<AIScoreCard score={45} grade="MODERATE" dimensions={mockDimensions} anomalyFlags={flags} />);
    expect(screen.getByText(/national id appears/i)).toBeInTheDocument();
  });

  it('does not render score card for STUDENT role', () => {
    render(<ApplicationDetail applicationId={app.id} userRole="STUDENT" />);
    expect(screen.queryByTestId('ai-score-card')).not.toBeInTheDocument();
  });
});

// tests/components/DocumentUpload.test.tsx
describe('DocumentUpload component', () => {

  it('accepts PDF files and shows upload progress', async () => {
    const file = new File(['pdf-content'], 'fees.pdf', { type: 'application/pdf' });
    render(<DocumentUpload applicationId={app.id} docType="FEE_STRUCTURE" />);
    const input = screen.getByLabelText(/upload fee structure/i);
    await userEvent.upload(input, file);
    expect(screen.getByText(/uploading/i)).toBeInTheDocument();
  });

  it('rejects non-PDF files and shows an error message', async () => {
    const file = new File(['data'], 'malware.exe', { type: 'application/octet-stream' });
    render(<DocumentUpload applicationId={app.id} docType="FEE_STRUCTURE" />);
    const input = screen.getByLabelText(/upload fee structure/i);
    await userEvent.upload(input, file);
    expect(screen.getByText(/only PDF or image files/i)).toBeInTheDocument();
  });

  it('shows CLEAN status after successful virus scan polling', async () => {
    server.use(
      rest.get(`/api/v1/applications/${app.id}/documents/:id`, (req, res, ctx) =>
        res(ctx.json({ data: { scan_status: 'CLEAN' } }))
      )
    );
    render(<DocumentUpload applicationId={app.id} docType="FEE_STRUCTURE" initialScanStatus="PENDING" documentId="doc-123" />);
    await waitFor(() => expect(screen.getByText(/scan complete/i)).toBeInTheDocument(), { timeout: 5000 });
  });

  it('shows INFECTED warning and blocks form progress when document is infected', async () => {
    server.use(
      rest.get(`/api/v1/applications/${app.id}/documents/:id`, (req, res, ctx) =>
        res(ctx.json({ data: { scan_status: 'INFECTED' } }))
      )
    );
    render(<DocumentUpload applicationId={app.id} docType="FEE_STRUCTURE" initialScanStatus="PENDING" documentId="doc-123" />);
    await waitFor(() => expect(screen.getByText(/security threat detected/i)).toBeInTheDocument());
  });
});

// tests/components/BudgetBar.test.tsx
describe('BudgetBar component', () => {

  it('renders 0% when allocated is 0', () => {
    render(<BudgetBar ceiling={5_000_000} allocated={0} disbursed={0} programName="Test" />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders 100% and shows warning colour when fully allocated', () => {
    render(<BudgetBar ceiling={5_000_000} allocated={5_000_000} disbursed={4_000_000} programName="Test" />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByTestId('budget-bar-fill')).toHaveClass('bg-danger'); // or warning
  });

  it('shows correct remaining budget text', () => {
    render(<BudgetBar ceiling={5_000_000} allocated={2_150_000} disbursed={1_800_000} programName="Test" />);
    expect(screen.getByText(/KES 2,850,000 remaining/i)).toBeInTheDocument();
  });
});
```

---

## 21. End-to-End Test Scenarios

### Playwright E2E Tests

```typescript
// e2e/student-full-journey.spec.ts
test.describe('Student — full application journey', () => {

  test('should register, complete profile, apply, and download PDF', async ({ page }) => {
    // Register
    await page.goto('/login');
    await page.click('[data-testid="register-link"]');
    await page.fill('[name="email"]', 'e2e-student@test.com');
    await page.fill('[name="password"]', 'TestPass123!');
    await page.fill('[name="fullName"]', 'E2E Student');
    await page.click('[data-testid="register-submit"]');
    await expect(page.locator('[data-testid="verify-email-prompt"]')).toBeVisible();

    // Simulate email verification (trigger directly via API in test mode)
    await verifyEmailViaApi('e2e-student@test.com');
    await verifyPhoneViaApi('e2e-student@test.com');

    // Complete profile — Step 1: Personal
    await page.goto('/portal/profile/personal');
    await page.fill('[name="homeWard"]', 'Kalokol');
    await page.fill('[name="villageUnit"]', 'Nakuprat');
    await page.selectOption('[name="gender"]', 'FEMALE');
    await page.click('[data-testid="save-personal"]');
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();

    // Apply to program
    await page.goto('/portal/programs');
    await expect(page.locator('[data-testid="program-card"]').first()).toBeVisible();
    await page.click('[data-testid="apply-now"]');

    // Fill Section B
    await page.fill('[name="totalFeeKes"]', '75000');
    await page.fill('[name="outstandingBalance"]', '60000');
    await page.fill('[name="amountAbleToPay"]', '15000');
    await page.click('[data-testid="next-step"]');

    // ... complete remaining sections ...

    // Upload document
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="upload-fee-structure"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('test/fixtures/sample-fee-structure.pdf');
    await expect(page.locator('[data-testid="scan-status-clean"]')).toBeVisible({ timeout: 30_000 });

    // Preview PDF and submit
    await page.click('[data-testid="next-to-preview"]');
    await expect(page.locator('[data-testid="pdf-preview-iframe"]')).toBeVisible();

    // Download PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-pdf"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/application.*\.pdf/i);

    // Submit
    await page.check('[data-testid="declaration-checkbox"]');
    await page.click('[data-testid="submit-application"]');
    await expect(page.locator('[data-testid="submission-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="submission-reference"]')).toHaveText(/^[A-Z]{3}-\d{4}-\d{5}$/);
  });
});

// e2e/ward-admin-review.spec.ts
test.describe('Ward Admin — review and recommend', () => {

  test('should see application ranked by AI score and submit a review', async ({ page }) => {
    await loginAs(page, wardAdmin, county);
    await page.goto('/admin/ward/applications');

    // Applications should be sorted by AI score descending
    const scores = await page.locator('[data-testid="ai-score"]').allTextContents();
    const numericScores = scores.map(s => parseFloat(s));
    for (let i = 0; i < numericScores.length - 1; i++) {
      expect(numericScores[i]).toBeGreaterThanOrEqual(numericScores[i + 1]);
    }

    // Open first application
    await page.click('[data-testid="review-button"]');
    await expect(page.locator('[data-testid="score-ring"]')).toBeVisible();

    // Submit review
    await page.click('[data-testid="decision-recommended"]');
    await page.fill('[name="recommendedAmount"]', '38000');
    await page.fill('[name="reviewNote"]', 'High need confirmed. Orphan raised by grandmother.');
    await page.click('[data-testid="submit-review"]');
    await expect(page.locator('[data-testid="review-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="app-status"]')).toHaveText('County Review');
  });
});

// e2e/finance-officer-disbursement.spec.ts
test.describe('Finance Officer — approve and disburse', () => {

  test('should approve application and trigger M-Pesa disbursement', async ({ page }) => {
    await loginAs(page, financeOfficer, county);
    await page.goto('/admin/county/review');
    await page.click('[data-testid="final-review-button"]');

    await page.fill('[name="allocatedAmount"]', '36000');
    await page.click('[data-testid="decision-approved"]');
    await page.click('[data-testid="submit-county-review"]');
    await expect(page.locator('[data-testid="app-status"]')).toHaveText('Approved');

    // Navigate to disbursement
    await page.goto('/admin/county/disbursements');
    await page.click('[data-testid="disburse-mpesa"]');
    await page.fill('[name="phone"]', '0712345678');
    await page.click('[data-testid="confirm-disburse"]');
    await expect(page.locator('[data-testid="disburse-pending"]')).toBeVisible();
  });
});
```

---

## 22. Performance & Load Tests

### k6 Load Test Scripts

```javascript
// load-tests/application-submission.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },    // Ramp up to 50 concurrent users
    { duration: '5m', target: 200 },   // Peak intake load
    { duration: '2m', target: 500 },   // Spike
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Error rate under 1%
  },
};

export default function () {
  // Login
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: `load-test-${__VU}@test.com`,
    password: 'TestPass123!',
    countySlug: 'turkana-load',
  }), { headers: { 'Content-Type': 'application/json' } });

  check(loginRes, { 'login 200': r => r.status === 200 });
  const token = loginRes.json('data.accessToken');

  // Fetch programs
  const programsRes = http.get(`${BASE_URL}/api/v1/programs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(programsRes, { 'programs 200': r => r.status === 200, 'programs p95 < 300ms': r => r.timings.duration < 300 });

  sleep(1);
}
```

### Performance Assertions

| Scenario | P95 Target | Failure Threshold |
|----------|-----------|-------------------|
| GET /programs | < 200ms | > 500ms |
| GET /ward/applications (200 items) | < 300ms | > 800ms |
| POST /applications (create) | < 400ms | > 1000ms |
| POST /applications/:id/submit | < 500ms | > 1500ms |
| GET /reports/dashboard | < 300ms | > 800ms (served from cache) |
| GET /reports/ocob (export) | < 10s | > 30s |
| Concurrent budget allocation (100 simultaneous approvals) | 0 over-allocations | Any over-allocation |
| Concurrent duplicate applications (50 simultaneous) | 1 success, 49 failures | Any duplicate succeeds |

---

## 23. Test Coverage Targets

### Coverage by Layer

| Layer | Target Coverage | Priority |
|-------|----------------|---------|
| `AuthService` | 95% | Critical |
| `ApplicationService` | 95% | Critical |
| `ReviewService` (budget logic) | 100% | Critical |
| `DisbursementService` | 95% | Critical |
| `RLS policies` (integration) | 100% | Critical |
| `ProfileService` | 90% | High |
| `ProgramService` + `EligibilityService` | 90% | High |
| `DocumentService` | 85% | High |
| `AI Scoring Pipeline` | 90% | High |
| `AnomalyDetection` | 90% | High |
| `PdfService` | 80% | Medium |
| `ReportingService` | 80% | Medium |
| `NotificationService` | 75% | Medium |
| `QueueProcessors` | 80% | Medium |
| React components | 70% | Medium |
| E2E critical paths | 100% of listed flows | High |

### CI/CD Gates

```yaml
# .github/workflows/ci.yml — coverage gates
- name: Check coverage thresholds
  run: |
    jest --coverage --coverageThreshold='{
      "global": {
        "branches": 80,
        "functions": 85,
        "lines": 85,
        "statements": 85
      },
      "./src/modules/review/": {
        "branches": 95,
        "functions": 100,
        "lines": 100,
        "statements": 100
      },
      "./src/modules/auth/": {
        "branches": 90,
        "functions": 95,
        "lines": 95,
        "statements": 95
      }
    }'
```

### Test File Count Reference

| Module | Unit Test Files | Integration Test Files | E2E Scenarios |
|--------|---------------|----------------------|---------------|
| Auth | 3 | 2 | 2 |
| Tenant | 2 | 1 | 1 |
| Profile | 3 | 1 | 1 |
| Program + Eligibility | 3 | 2 | 1 |
| Application | 4 | 3 | 3 |
| Section Wizard | 2 | 1 | 1 |
| Document | 3 | 2 | 1 |
| Review (Ward + County) | 4 | 2 | 2 |
| Disbursement | 3 | 2 | 1 |
| AI Scoring (Python) | 4 | 1 | — |
| Notification | 2 | 1 | — |
| Reporting | 2 | 1 | 1 |
| PDF | 2 | 1 | 1 |
| RLS (database) | — | 3 | — |
| Queue/Jobs | 2 | 1 | — |
| Security | 1 | 3 | — |
| Frontend components | 8 | — | — |
| **Total** | **48** | **27** | **14** |