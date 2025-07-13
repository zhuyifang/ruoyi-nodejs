// src/sys-user/sys-user.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SysUser } from './sys-user.entity';
// 引入我们刚刚创建的 Controller 和 Service
import { SysUserController } from './sys-user.controller';
import { SysUserService } from './sys-user.service';
import {SysRole} from "../sys-role/sys-role.entity";

@Module({
    imports: [TypeOrmModule.forFeature([SysUser, SysRole])],
    controllers: [SysUserController],
    providers: [SysUserService],
    // 如果其他模块需要使用 SysUserService (比如认证模块)，则需要导出
    exports: [SysUserService],
})
export class SysUserModule {}