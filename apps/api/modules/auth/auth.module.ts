/**
 * Purpose: Wire authentication providers, controllers, and strategies.
 * Why important: Establishes the identity boundary used by protected API routes.
 * Used by: AppModule and all modules requiring authenticated access.
 */
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthTokenService } from './auth-token.service';
import { AuthService } from './auth.service';
import { AuthSessionService } from './auth-session.service';
import { PasswordResetService } from './password-reset.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RedisModule } from '../../redis/redis.module';

@Module({
	imports: [
		RedisModule,
		PassportModule.register({ defaultStrategy: 'jwt' }),
		JwtModule.registerAsync({
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				secret: configService.getOrThrow<string>('auth.jwtSecret'),
				signOptions: {
					expiresIn: configService.get<string>('auth.accessTokenTtl', '15m') as never,
				},
			}),
		}),
	],
	controllers: [AuthController],
	providers: [AuthService, AuthSessionService, AuthTokenService, PasswordResetService, JwtStrategy],
	exports: [AuthService, JwtModule],
})
export class AuthModule {}
