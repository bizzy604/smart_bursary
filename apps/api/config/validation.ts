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
	PORT: Joi.number().port().default(3000),
	API_PREFIX: Joi.string().default('api/v1'),
	DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
	JWT_SECRET: Joi.string().min(16).required(),
	REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).optional().allow(''),
	ACCESS_TOKEN_TTL: Joi.string().default('15m'),
	REFRESH_TOKEN_TTL: Joi.string().default('7d'),
});

export default validationSchema;
