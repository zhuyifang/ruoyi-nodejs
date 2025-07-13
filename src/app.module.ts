import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SysAuthModule } from './system/sys-auth/sys-auth.module';
import { SysUserModule } from './system/sys-user/sys-user.module'; // 导入 SysUserModule
import { SysRoleModule } from './system/sys-role/sys-role.module'; // 导入角色模块
import { SysMenuModule } from './system/sys-menu/sys-menu.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SysSeederModule } from './system/sys-seeder/sys-seeder.module';
import {APP_GUARD, APP_INTERCEPTOR} from '@nestjs/core';
import { PermissionsGuard } from './common/guards/permissions.guard'; // 导入菜单模块
import { SysToolModule } from './system/sys-tool/sys-tool.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PluginLoaderModule } from './core/plugin-loader/plugin-loader.module';
import {SuccessResponseInterceptor} from "@/common/interceptors/success-response.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 关键点：设置为全局模块
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], // 导入 ConfigModule 以便在 useFactory 中使用
      inject: [ConfigService], // 注入 ConfigService
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        autoLoadEntities: true,
        // 关键：在生产环境中应设为 false，并使用数据库迁移 (migrations)
        synchronize: process.env.NODE_ENV !== 'production',
        logging: true,
      }),
    }),
    SysUserModule,
    SysAuthModule,
    SysRoleModule,
    SysMenuModule,
    SysSeederModule,
    SysToolModule,
    PluginLoaderModule.forRootAsync(),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SuccessResponseInterceptor,
    },
  ],
})
export class AppModule {}
