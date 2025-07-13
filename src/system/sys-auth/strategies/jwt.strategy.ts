// src/sys-auth/strategies/jwt.strategy.ts
import {ExtractJwt, Strategy} from 'passport-jwt';
import {PassportStrategy} from '@nestjs/passport';
import {ConfigService} from '@nestjs/config';
import {Injectable} from '@nestjs/common';
import {SysUserService} from "@/system/sys-user/sys-user.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor( private readonly configService: ConfigService, // 2. 确保注入
                 private readonly userService: SysUserService,) {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
            throw new Error(
                'JWT_SECRET is not defined in the environment variables. Application cannot start.',
            );
        }
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret, // `secret` is now guaranteed to be a string
        });
    }

    /**
     * Passport 会在验证 JWT 签名后调用此方法
     * 此方法的返回值会被附加到 Request 对象上 (例如 req.user)
     * @param payload JWT 解码后的负载
     */
    async validate(payload: { sub: number; username: string }) {
        return await this.userService.findOneById(payload.sub);
    }
}