// src/seeder/seeder.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SysSeederService } from './sys-seeder.service';
import { SysUser } from '../sys-user/sys-user.entity';
import { SysRole } from '../sys-role/sys-role.entity';

@Module({
    // 导入 TypeORM 模块，并注册 User 和 Role 实体，以便在 SeederService 中使用它们的 Repository
    imports: [TypeOrmModule.forFeature([SysUser, SysRole])],
    // 将 SeederService 注册为提供者
    providers: [SysSeederService],
})
export class SysSeederModule {}