/**
 * Purpose: Provide reusable JWT auth guard wrapper.
 * Why important: Standardizes bearer-token protection across modules.
 * Used by: Protected controller routes.
 */
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
