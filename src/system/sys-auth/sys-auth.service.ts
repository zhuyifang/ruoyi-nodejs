// src/sys-auth/sys-auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SysUserService } from 'src/system/sys-user/sys-user.service';
import * as bcrypt from 'bcrypt';
import { SysUser } from 'src/system/sys-user/sys-user.entity';

@Injectable()
export class SysAuthService {
    constructor(
        private readonly sysUserService: SysUserService,
        private readonly jwtService: JwtService,
    ) {}

    /**
     * 验证用户密码是否正确
     * @param username 用户名
     * @param pass 密码
     * @returns 验证成功则返回用户信息，否则返回 null
     */
    async validateUser(username: string, pass: string): Promise<Omit<SysUser, 'password'> | null> {
        const user = await this.sysUserService.findOneByUsername(username);
        if (user && (await bcrypt.compare(pass, user.password))) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password, ...result } = user; // 从返回结果中剔除密码
            return result;
        }
        return null;
    }

    /**
     * 用户登录成功后，生成 JWT
     * @param user 用户信息
     * @returns 返回 access_token
     */
    async login(user: Omit<SysUser, 'password'>) {
        const payload = { username: user.username, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}