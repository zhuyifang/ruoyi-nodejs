// src/system/sys-seeder/sys-seeder.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // 1. 导入 TypeOrmModule
import { SysSeederService } from './sys-seeder.service';
import { SysUserSeederService } from '../sys-user/sys-user.seeder.service';
import { SysRoleSeederService } from '../sys-role/sys-role.seeder.service';
import { SysMenuSeederService } from '../sys-menu/sys-menu.seeder.service';
import { SysUser } from '../sys-user/sys-user.entity';
import { SysRole } from '../sys-role/sys-role.entity';
import { SysMenu } from '../sys-menu/sys-menu.entity';

@Module({
    imports: [
        // 2. 【关键修复】在此处导入 TypeOrmModule 并注册所有 Seeder 需要的实体。
        // 这样，NestJS 就能为 SysRole, SysUser, SysMenu 创建并提供对应的 Repository。
        TypeOrmModule.forFeature([SysRole, SysUser, SysMenu]),
    ],
    // 3. 将所有 Seeder 服务都作为提供者，以便 SysSeederService 可以注入它们。
    providers: [
        SysSeederService,
        SysUserSeederService,
        SysRoleSeederService,
        SysMenuSeederService,
    ],
})
export class SysSeederModule {}