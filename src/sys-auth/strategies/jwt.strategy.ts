// src/sys-auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 从 Authorization Header 中提取 Bearer Token
            ignoreExpiration: false, // 不忽略过期时间
            secretOrKey: 'YOUR_SECRET_KEY', // 必须与 JwtModule.register 中的 secret 一致！
        });
    }

    /**
     * Passport 会在验证 JWT 签名后调用此方法
     * 此方法的返回值会被附加到 Request 对象上 (例如 req.user)
     * @param payload JWT 解码后的负载
     */
    async validate(payload: { sub: number; username: string }) {
        // 这里可以根据 payload.sub (用户ID) 去数据库查一次用户，以获取最新信息
        // 但为了性能，通常直接信任 payload 中的信息
        return { userId: payload.sub, username: payload.username };
    }
}