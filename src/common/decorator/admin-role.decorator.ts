import { SetMetadata } from '@nestjs/common';

export const ADMIN_ROLES_KEY = 'admin_roles';
export const AdminRole = (...roles: string[]) => SetMetadata(ADMIN_ROLES_KEY, roles);
