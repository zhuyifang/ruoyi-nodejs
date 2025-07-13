import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config'; // 1. 确保导入
import { SysAuthService } from './sys-auth.service';
import { SysAuthController } from './sys-auth.controller';
import { SysUserModule } from '../sys-user/sys-user.module';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
    imports: [
        SysUserModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule], // 2. 导入 ConfigModule
            inject: [ConfigService],  // 3. 注入 ConfigService
            useFactory: async (configService: ConfigService) => ({
                // 4. 【关键】确保这里的环境变量名与 JwtStrategy 中的完全一致
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '24h' }, // 例如：设置过期时间为 24 小时
            }),
        }),
    ],
    controllers: [SysAuthController],
    providers: [SysAuthService, LocalStrategy, JwtStrategy],
})
export class SysAuthModule {}