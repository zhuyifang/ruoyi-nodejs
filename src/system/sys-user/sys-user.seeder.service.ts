// src/system/sys-user/sys-user.seeder.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { SysUser } from './sys-user.entity';
import { SysRole } from '../sys-role/sys-role.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SysUserSeederService {
    private readonly logger = new Logger(SysUserSeederService.name);

    constructor(
        @InjectRepository(SysUser)
        private readonly userRepository: Repository<SysUser>,
        // 1. 角色对象将通过参数传入，不再需要在此处注入 RoleRepository
        // @InjectRepository(SysRole)
        // private readonly roleRepository: Repository<SysRole>,
        private readonly configService: ConfigService,
    ) {}

    /**
     * 查找或创建用户，并直接关联传入的角色实体
     * @param userData 用户的基本数据
     * @param role 要关联的角色实体
     */
    private async findOrCreateUser(
        userData: Partial<SysUser>,
        // 2. 将参数从 roleKey: string 修改为 role: SysRole
        role: SysRole,
    ): Promise<void> {
        if (!userData.password) {
            this.logger.error(
                `用户 "${userData.username}" 的密码缺失，跳过创建。`,
            );
            return;
        }

        const existingUser = await this.userRepository.findOne({
            where: { username: userData.username },
        });

        if (existingUser) {
            return;
        }

        // 3. 不再需要从数据库查询角色，因为角色对象已经作为参数传入
        // 这使得代码更高效，且与具体的 roleKey 解耦
        if (!role) {
            this.logger.warn(
                `提供的角色实体无效，跳过为 "${userData.username}" 创建用户。`,
            );
            return;
        }

        this.logger.log(`正在创建用户: ${userData.username}`);

        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(userData.password, salt);

        const newUser = this.userRepository.create({
            ...userData,
            password: hashedPassword,
            // 4. 直接使用传入的角色对象进行关联
            roles: [role],
        });

        await this.userRepository.save(newUser);
    }

    /**
     * 运行用户数据填充
     * @param adminRole 要分配给 admin 用户的角色实体
     */
    // 5. 修改 seed 方法签名，使其能够接收一个 SysRole 类型的参数
    async seed(adminRole: SysRole) {
        this.logger.log('开始填充用户数据...');

        const adminPassword = this.configService.get<string>('ADMIN_PASSWORD') || 'admin';
        const adminEmail = this.configService.get<string>('ADMIN_EMAIL') || 'admin@example.com';

        await this.findOrCreateUser(
            {
                username: 'admin',
                password: adminPassword,
                nickName: '超级管理员',
                email: adminEmail,
                status: true,
            },
            // 6. 将接收到的角色对象传递给内部的辅助方法
            adminRole,
        );

        this.logger.log('用户数据填充完成。');
    }
}