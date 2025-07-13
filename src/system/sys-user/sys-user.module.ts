import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SysUser } from './sys-user.entity';
import { SysUserController } from './sys-user.controller';
import { SysUserService } from './sys-user.service';
import { SysUserSeederService } from './sys-user.seeder.service';
import { SysRole } from '../sys-role/sys-role.entity';

@Module({
    imports: [TypeOrmModule.forFeature([SysUser, SysRole])],
    controllers: [SysUserController],
    providers: [SysUserService, SysUserSeederService],
    exports: [SysUserService, SysUserSeederService],
})
export class SysUserModule {}
    