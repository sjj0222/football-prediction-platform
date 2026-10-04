import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@shared/api.interface';

export const ROLES_KEY = 'roles';

/**
 * 声明访问当前路由所需的角色列表。
 * 未声明时（无 @Roles / @AdminOnly）表示任意已登录用户可访问。
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/** 仅管理员可访问 */
export const AdminOnly = () => SetMetadata(ROLES_KEY, ['admin']);
