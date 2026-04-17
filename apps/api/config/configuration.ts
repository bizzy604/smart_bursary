/**
 * Purpose: Provide strongly grouped app runtime configuration values.
 * Why important: Keeps environment access centralized and predictable.
 * Used by: App bootstrap, controllers, and services requiring app settings.
 */
export default () => ({
	app: {
		nodeEnv: process.env.NODE_ENV ?? 'development',
		port: Number.parseInt(process.env.PORT ?? '3000', 10),
		apiPrefix: process.env.API_PREFIX ?? 'api/v1',
	},
	auth: {
		jwtSecret: process.env.JWT_SECRET ?? '',
		accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
		refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? '7d',
	},
	storage: {
		s3Bucket: process.env.S3_BUCKET ?? '',
		s3Region: process.env.S3_REGION ?? '',
		s3Endpoint: process.env.S3_ENDPOINT ?? '',
		s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
		s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE ?? 'false',
		signedUrlTtlSeconds: Number.parseInt(process.env.S3_SIGNED_URL_TTL_SECONDS ?? '900', 10),
	},
	internal: {
		serviceKey: process.env.INTERNAL_SERVICE_KEY ?? '',
	},
});
