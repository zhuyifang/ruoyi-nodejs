// 在您的 PermissionsGuard 文件中 (e.g., src/common/guards/permissions.guard.ts)
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
const PUBLIC_URLS = [
    '/sys-auth/login',
    '/sys-auth/captcha',
];


@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const url = request.url;
        if (PUBLIC_URLS.includes(url)) {
            return true; // 如果是，直接放行
        }
        // 1. 获取路由上通过 @RequirePermissions() 装饰器设置的权限要求
        const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());

        // 2. 如果该路由没有设置权限要求，则直接放行
        if (!requiredPermissions) {
            return true;
        }

        // 3. 获取请求对象中的 user，它应该由 AuthGuard('jwt') 填充
        const { user } = context.switchToHttp().getRequest();

        // 4. 【关键修正】如果 user 对象不存在，说明用户未登录或 Token 无效。
        //    这属于认证问题，应抛出 UnauthorizedException (401)，而不是 ForbiddenException (403)。
        if (!user) {
            throw new UnauthorizedException('用户未登录或身份验证失败');
        }

        // 5. 如果用户存在，则开始检查其权限
        //    这里的 user.roles 来自于 SysUserService 中查询用户时加载的 relations
        const userPermissions = new Set<string>();
        user.roles.forEach(role => {
            role.menus.forEach(menu => {
                if (menu.perms) {
                    userPermissions.add(menu.perms);
                }
            });
        });

        // 6. 检查用户拥有的权限是否满足路由要求
        const hasPermission = requiredPermissions.every(perm => userPermissions.has(perm));

        if (hasPermission) {
            return true;
        } else {
            // 7. 用户已登录，但权限不足。这才是真正的“禁止访问”场景。
            throw new ForbiddenException('您没有权限执行此操作');
        }
    }
}