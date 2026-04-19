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
