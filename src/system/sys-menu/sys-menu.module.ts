// src/sys-menu/sys-menu.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SysMenu } from './sys-menu.entity';
import { SysMenuController } from './sys-menu.controller';
import { SysMenuService } from './sys-menu.service';
import { SysMenuSeederService } from './sys-menu.seeder.service';

@Module({
    // 注册 SysMenu 实体
    imports: [TypeOrmModule.forFeature([SysMenu])],
    // 注册菜单控制器
    controllers: [SysMenuController],
    // 注册菜单服务
    providers: [SysMenuService, SysMenuSeederService],
    // 导出菜单服务
    exports: [SysMenuService, SysMenuSeederService],
})
export class SysMenuModule {}