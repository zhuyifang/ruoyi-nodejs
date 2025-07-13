// src/sys-auth/sys-auth.controller.ts
import { Controller, Post, UseGuards, Request, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SysAuthService } from './sys-auth.service';

@Controller('sys-auth')
export class SysAuthController {
    constructor(private readonly authService: SysAuthService) {}

    /**
     * 登录接口
     * @UseGuards(AuthGuard('local')) 会触发 LocalStrategy
     */
    @UseGuards(AuthGuard('local'))
    @Post('login')
    async login(@Request() req) {
        // LocalStrategy 的 validate 方法成功执行后，会将返回值附加到 req.user 上
        return this.authService.login(req.user);
    }

    /**
     * 这是一个受保护的接口，用于测试 JWT 验证
     * @UseGuards(AuthGuard('jwt')) 会触发 JwtStrategy
     */
    @UseGuards(AuthGuard('jwt'))
    @Get('profile')
    getProfile(@Request() req) {
        // JwtStrategy 的 validate 方法成功执行后，会将返回值附加到 req.user 上
        return req.user;
    }
}