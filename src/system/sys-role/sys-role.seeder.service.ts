import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SysRole } from './sys-role.entity';

@Injectable()
export class SysRoleSeederService {
    private readonly logger = new Logger(SysRoleSeederService.name);

    constructor(
        @InjectRepository(SysRole)
        private readonly roleRepository: Repository<SysRole>,
    ) {}

    /**
     * 查找或创建角色，确保数据不重复
     * @param roleKey 角色的唯一标识
     * @param defaults 角色的默认数据
     * @returns 创建或找到的角色实体
     */
    private async findOrCreate(
        roleKey: string,
        defaults: Partial<SysRole>,
    ): Promise<SysRole> {
        const existingRole = await this.roleRepository.findOne({ where: { roleKey } });
        if (existingRole) {
            return existingRole;
        }

        this.logger.log(`Creating role: ${defaults.roleName} (${roleKey})`);
        const newRole = this.roleRepository.create({ ...defaults, roleKey });
        return this.roleRepository.save(newRole);
    }

    /**
     * 运行角色数据填充，并返回超级管理员角色
     * @returns {Promise<SysRole>} 超级管理员角色实体
     */
    async seed(): Promise<SysRole> {
        this.logger.log('Start seeding roles...');

        const roleDefaults = {
            roleName: '超级管理员',
            roleKey: 'admin',
            status: true,
            remark: '拥有所有权限',
        };

        let adminRole = await this.roleRepository.findOne({ where: { roleKey: 'admin' } });

        if (adminRole) {
            this.logger.log('Admin role already exists. Updating to ensure consistency...');
            this.roleRepository.merge(adminRole, roleDefaults);
        } else {
            this.logger.log('Creating admin role...');
            adminRole = this.roleRepository.create(roleDefaults);
        }

        return this.roleRepository.save(adminRole);
    }
}