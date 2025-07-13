// src/sys-role/sys-role.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SysRole } from './sys-role.entity';
import { SysRoleController } from './sys-role.controller';
import { SysRoleService } from './sys-role.service';

@Module({
    // 使用 forFeature 方法注册 SysRole 实体，使其可以在模块内通过 @InjectRepository() 注入
    imports: [TypeOrmModule.forFeature([SysRole])],
    // 注册角色控制器，处理角色相关的 HTTP 请求
    controllers: [SysRoleController],
    // 注册角色服务，处理角色相关的业务逻辑
    providers: [SysRoleService],
    // 导出角色服务，以便其他模块（如权限守卫）可以使用它
    exports: [SysRoleService],
})
export class SysRoleModule {}