// src/sys-auth/strategies/local.strategy.ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SysAuthService } from '../sys-auth.service';
import { SysUser } from 'src/sys-user/sys-user.entity';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly authService: SysAuthService) {
        super(); // 默认会使用 body 中的 username 和 password 字段
    }

    async validate(username: string, password: string): Promise<Omit<SysUser, 'password'>> {
        const user = await this.authService.validateUser(username, password);
        if (!user) {
            throw new UnauthorizedException('用户名或密码错误');
        }
        return user;
    }
}