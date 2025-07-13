// src/common/guards/permissions.guard.ts
import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SysUserService } from '../../sys-user/sys-user.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private userService: SysUserService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // 1. 使用 Reflector 获取在 Controller/Handler 上设置的元数据
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );

        // 2. 如果没有设置权限要求，则默认放行
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        // 3. 从请求中获取用户信息 (由 AuthGuard 添加)
        const { user } = context.switchToHttp().getRequest();
        if (!user) {
            throw new ForbiddenException('用户未登录，禁止访问');
        }

        // 4. 特殊情况：超级管理员 (roleKey: 'admin') 拥有所有权限，直接放行
        if (user.roles && user.roles.some((role) => role.roleKey === 'admin')) {
            return true;
        }

        // 5. 查询用户拥有的所有权限
        const userPermissions = await this.userService.findUserPermissions(user.id);

        // 6. 检查用户权限是否包含至少一个所需的权限
        const hasPermission = requiredPermissions.some((permission) =>
            userPermissions.includes(permission),
        );

        if (!hasPermission) {
            throw new ForbiddenException('您没有权限访问此资源');
        }

        return true;
    }
}