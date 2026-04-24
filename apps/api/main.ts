/**
 * Purpose: Bootstrap the NestJS application with global HTTP concerns.
 * Why important: Ensures consistent validation, security headers, docs, and startup behavior.
 * Used by: Runtime startup command and integration tests.
 */
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create(AppModule);
	const configService = app.get(ConfigService);
	const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
	const port = configService.get<number>('app.port', 3001);
	const corsAllowedOrigins = configService
		.get<string>('app.corsAllowedOrigins', 'http://localhost:3000,http://127.0.0.1:3000')
		.split(',')
		.map((origin) => origin.trim())
		.filter((origin) => origin.length > 0);

	app.enableCors({
		origin: corsAllowedOrigins,
		credentials: true,
		methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
		exposedHeaders: ['X-Request-Id'],
	});

	app.use(helmet());
	app.use(compression());
	app.use(cookieParser());
	app.setGlobalPrefix(apiPrefix);
	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			whitelist: true,
			forbidNonWhitelisted: true,
		}),
	);

	const swaggerConfig = new DocumentBuilder()
		.setTitle('Smart Bursary API')
		.setDescription('KauntyBursary backend API')
		.setVersion('1.0.0')
		.addBearerAuth()
		.addCookieAuth('__refresh_token')
		.build();

	const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
	SwaggerModule.setup(`${apiPrefix}/docs`, app, swaggerDocument);

	await app.listen(port);
}

void bootstrap();
