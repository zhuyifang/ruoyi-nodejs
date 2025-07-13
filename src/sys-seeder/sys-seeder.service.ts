// src/sys-seeder/sys-sys-seeder.service.ts
import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SysUser } from '../sys-user/sys-user.entity';
import { SysRole } from '../sys-role/sys-role.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SysSeederService implements OnApplicationBootstrap {
    // 使用 NestJS 的日志服务，让输出更美观
    private readonly logger = new Logger(SysSeederService.name);

    constructor(
        @InjectRepository(SysUser)
        private readonly userRepository: Repository<SysUser>,
        @InjectRepository(SysRole)
        private readonly roleRepository: Repository<SysRole>,
    ) {}

    /**
     * OnApplicationBootstrap 是一个生命周期钩子，
     * 它会在所有模块都加载完毕，且数据库连接成功后执行。
     * 这是执行数据填充的理想时机。
     */
    async onApplicationBootstrap() {
        await this.seed();
    }

    private async seed() {
        // 1. 检查并创建“超级管理员”角色
        let adminRole = await this.roleRepository.findOne({
            where: { roleKey: 'admin' },
        });

        if (!adminRole) {
            this.logger.log('超级管理员角色不存在，正在创建...');
            const newRole = this.roleRepository.create({
                name: '超级管理员',
                roleKey: 'admin',
                status: true,
                remark: '系统内置超级管理员，拥有所有权限',
            });
            adminRole = await this.roleRepository.save(newRole);
            this.logger.log('超级管理员角色创建成功！');
        } else {
            this.logger.log('超级管理员角色已存在，跳过创建。');
        }

        // 2. 检查并创建“admin”用户
        const adminUser = await this.userRepository.findOne({
            where: { username: 'admin' },
        });

        if (!adminUser) {
            this.logger.log('admin 用户不存在，正在创建...');
            const hashedPassword = await bcrypt.hash('admin123', 10);

            const newUser = this.userRepository.create({
                username: 'admin',
                password: hashedPassword,
                email: 'admin@example.com',
                status: true,
                roles: [adminRole], // 将“超级管理员”角色关联给新用户
            });

            await this.userRepository.save(newUser);
            this.logger.log('admin 用户创建成功！默认密码: admin123');
        } else {
            this.logger.log('admin 用户已存在，跳过创建。');
        }
    }
}