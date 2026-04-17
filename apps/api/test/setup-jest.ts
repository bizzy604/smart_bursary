/**
 * Purpose: Configure deterministic test-time environment and external SDK mocks.
 * Why important: Keeps API integration tests independent from live AWS dependencies.
 * Used by: Jest via setupFilesAfterEnv in jest.config.ts.
 */

process.env.S3_BUCKET ??= 'smart-bursary-test-bucket';
process.env.S3_REGION ??= 'us-east-1';
process.env.S3_ACCESS_KEY_ID ??= 'test-access-key';
process.env.S3_SECRET_ACCESS_KEY ??= 'test-secret-key';
process.env.S3_SIGNED_URL_TTL_SECONDS ??= '900';

jest.mock('@aws-sdk/client-s3', () => {
	class S3Client {
		send = jest.fn().mockResolvedValue({});
	}

	class PutObjectCommand {
		constructor(public readonly input: Record<string, unknown>) {}
	}

	class GetObjectCommand {
		constructor(public readonly input: Record<string, unknown>) {}
	}

	return {
		S3Client,
		PutObjectCommand,
		GetObjectCommand,
	};
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
	getSignedUrl: jest.fn().mockResolvedValue('https://example-bucket.s3.amazonaws.com/mock-signed-url'),
}));
