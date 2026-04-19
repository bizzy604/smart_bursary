/**
 * Purpose: Define Joi schema for startup environment validation.
 * Why important: Forces fail-fast behavior when required runtime values are missing.
 * Used by: ConfigModule root initialization in app.module.ts.
 */
import * as Joi from 'joi';

const validationSchema = Joi.object({
	NODE_ENV: Joi.string()
		.valid('development', 'test', 'production')
		.default('development'),
	PORT: Joi.number().port().default(3001),
	API_PREFIX: Joi.string().default('api/v1'),
	DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
	JWT_SECRET: Joi.string().min(16).required(),
	REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).optional().allow(''),
	ACCESS_TOKEN_TTL: Joi.string().default('15m'),
	REFRESH_TOKEN_TTL: Joi.string().default('7d'),
	S3_BUCKET: Joi.string().trim().min(1).required(),
	S3_REGION: Joi.string().trim().min(1).required(),
	S3_ENDPOINT: Joi.string().uri({ scheme: ['http', 'https'] }).optional(),
	S3_ACCESS_KEY_ID: Joi.string().trim().min(1).optional(),
	S3_SECRET_ACCESS_KEY: Joi.string().trim().min(1).optional(),
	S3_FORCE_PATH_STYLE: Joi.boolean().truthy('true').falsy('false').default(false),
	S3_SIGNED_URL_TTL_SECONDS: Joi.number().integer().min(60).max(86400).default(900),
}).and('S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY');

export default validationSchema;
