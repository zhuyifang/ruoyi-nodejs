import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {SysAuthModule} from './sys-auth/sys-auth.module';
import {SysUserModule} from './sys-user/sys-user.module'; // 导入 SysUserModule
import {SysRoleModule} from './sys-role/sys-role.module'; // 导入角色模块
import {SysMenuModule} from './sys-menu/sys-menu.module';
import {ConfigModule} from "@nestjs/config";
import {SysSeederModule} from "./sys-seeder/sys-seeder.module";
import {APP_GUARD} from "@nestjs/core";
import {PermissionsGuard} from "./common/guards/permissions.guard"; // 导入菜单模块

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true, // 关键点：设置为全局模块
        }),
        TypeOrmModule.forRoot({
            type: 'sqlite', // 数据库类型更改为 sqlite
            database: 'db.sqlite', // SQLite 数据库文件名称，它将自动在项目根目录创建
            autoLoadEntities: true,
            synchronize: true, // 开发环境下自动同步表结构，生产环境请设为 false
            logging: true, // 开启日志
        }),
        SysUserModule,
        SysAuthModule,
        SysRoleModule,
        SysMenuModule,
        SysSeederModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_GUARD,
            useClass: PermissionsGuard,
        },],
})
export class AppModule {
}
