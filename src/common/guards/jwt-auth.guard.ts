// src/common/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

// 1. 定义一个公共路由的白名单
const PUBLIC_URLS = [
    '/sys-auth/login',
    '/sys-auth/captcha', // 假设未来有验证码接口
    // ... 其他需要公开访问的路由
];

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    // 在这个方案中，我们不再需要 Reflector
    // constructor(private reflector: Reflector) {
    //   super();
    // }

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();
        const url = request.url;

        // 2. 检查当前请求的 URL 是否在白名单中
        if (PUBLIC_URLS.includes(url)) {
            return true; // 如果是，直接放行
        }

        // 3. 如果不是，则执行默认的 JWT 认证流程
        return super.canActivate(context);
    }
}