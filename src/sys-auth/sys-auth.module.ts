// src/sys-auth/sys-auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SysUserModule } from 'src/sys-user/sys-user.module';
import { SysAuthService } from './sys-auth.service';
import { SysAuthController } from './sys-auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
    imports: [
        // 导入 SysUserModule 以便使用 SysUserService
        SysUserModule,
        // 默认策略为 jwt
        PassportModule.register({ defaultStrategy: 'jwt' }),
        // 配置 JWT 模块
        JwtModule.register({
            // 强烈建议将 secret 和 expiresIn 放在环境变量中
            secret: 'YOUR_SECRET_KEY', // 请务必替换为一个复杂的、随机的密钥！
            signOptions: { expiresIn: '24h' }, // token 过期时间，例如 '60s', '1h', '7d'
        }),
    ],
    controllers: [SysAuthController],
    // 注册 providers，策略也属于 provider
    providers: [SysAuthService, LocalStrategy, JwtStrategy],
})
export class SysAuthModule {}