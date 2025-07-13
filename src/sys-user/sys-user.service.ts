// src/sys-user/sys-user.service.ts
import {Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {In, Repository} from 'typeorm';
import {SysUser} from './sys-user.entity';
import * as bcrypt from 'bcrypt';
import {SysRole} from "../sys-role/sys-role.entity";
import {CreateUserDto} from "./dto/create-user.dto"; // 导入 bcrypt
@Injectable()
export class SysUserService {
    constructor(
        @InjectRepository(SysUser)
        private readonly userRepository: Repository<SysUser>,
        @InjectRepository(SysRole)
        private readonly roleRepository: Repository<SysRole>,

    ) {}

    // 示例：创建一个新用户
    async create(user: CreateUserDto): Promise<SysUser> {
        if (user.password) {
            user.password = await bcrypt.hash(user.password, 10);
        }
        const newUser = this.userRepository.create(user);
        return this.userRepository.save(newUser);
    }

    // 示例：根据用户名查找用户 (后续认证会用到)
    async findOneByUsername(username: string): Promise<SysUser | null> {
        return this.userRepository.findOne({ where: { username } });
    }

    // 示例：查找所有用户
    async findAll(): Promise<SysUser[]> {
        return this.userRepository.find({ relations: ['roles'] });
    }

    /**
     * 根据 ID 查找用户
     * @param id 用户ID
     */
    async findOneById(id: number): Promise<SysUser> {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['roles'], // 加载出关联的角色
        });
        if (!user) {
            throw new NotFoundException(`未找到ID为 ${id} 的用户`);
        }
        return user;
    }

    /**
     * 为用户分配角色
     * @param id 用户ID
     * @param roleIds 角色ID数组
     */
    async updateRoles(id: number, roleIds: number[]): Promise<void> {
        // 1. 查找目标用户
        const user = await this.findOneById(id);

        // 2. 查找所有对应的角色实体
        // 3. 更新用户的 roles 关系
        user.roles = await this.roleRepository.findBy({
            id: In(roleIds),
        });

        // 4. 保存更新后的用户实体
        await this.userRepository.save(user);
    }
    /**
     * 查找用户的所有权限标识
     * @param userId 用户ID
     */
    async findUserPermissions(userId: number): Promise<string[]> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            // 使用 relations 一次性加载所有相关的角色和菜单
            relations: ['roles', 'roles.menus'],
        });

        if (!user || !user.roles) {
            return [];
        }

        const permissions = new Set<string>();
        user.roles.forEach((role) => {
            // 确保角色是启用的
            if (role.status && role.menus) {
                role.menus.forEach((menu) => {
                    // 确保菜单是启用的，并且权限标识不为空
                    if (menu.status && menu.perms) {
                        permissions.add(menu.perms);
                    }
                });
            }
        });

        // 返回去重后的权限标识数组
        return Array.from(permissions);
    }
}