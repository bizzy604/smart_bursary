/**
 * Purpose: Attach role requirements to route handlers.
 * Why important: Enables centralized RBAC checks in the roles guard.
 * Used by: Controllers defining role-scoped endpoints.
 */
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
