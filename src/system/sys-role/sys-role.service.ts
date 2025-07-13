// src/sys-role/sys-role.service.ts
import {Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {In, Repository} from 'typeorm';
import {SysRole} from './sys-role.entity';
import {CreateRoleDto} from './dto/create-role.dto';
import {SysMenu} from "../sys-menu/sys-menu.entity";
import {PaginationDto} from "../../common/dto/pagination.dto";
import {BaseService} from '../../common/services/base.service';
import {QueryRoleDto} from "./dto/query-role.dto"; // 导入 BaseService

@Injectable()
export class SysRoleService extends BaseService<SysRole> { // 继承 BaseService
    constructor(
        @InjectRepository(SysRole)
        private readonly roleRepository: Repository<SysRole>,
        @InjectRepository(SysMenu)
        private readonly menuRepository: Repository<SysMenu>,
    ) {
        super(roleRepository);
    }

    async create(createRoleDto: CreateRoleDto): Promise<SysRole> {
        const role = this.roleRepository.create(createRoleDto);
        return this.roleRepository.save(role);
    }

    async findAll(paginationDto: PaginationDto,queryRoleDto: QueryRoleDto,): Promise<{ list: SysRole[], total: number }> {
        const safeSortByFields = ['id', 'username', 'email'];
        return this.paginate(
            paginationDto,
            queryRoleDto,
            {
                relations: ['roles'], // SysUser 需要加载 roles 关系
            },
            safeSortByFields,
        );
    }

    async findOne(id: number): Promise<SysRole> {
        const role = await this.roleRepository.findOne({where: {id}});
        if (!role) {
            throw new NotFoundException(`未找到ID为 ${id} 的角色`);
        }
        return role;
    }

    async update(id: number, updateRoleDto: Partial<CreateRoleDto>): Promise<SysRole> {
        const role = await this.findOne(id);
        // 将更新的字段合并到现有角色实体
        Object.assign(role, updateRoleDto);
        return this.roleRepository.save(role);
    }

    async remove(id: number): Promise<void> {
        const result = await this.roleRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`未找到ID为 ${id} 的角色`);
        }
    }

    /**
     * 为角色分配菜单权限
     * @param id 角色ID
     * @param menuIds 菜单ID数组
     */
    async updateMenus(id: number, menuIds: number[]): Promise<void> {
        // 1. 查找目标角色，并加载它当前的菜单关系
        const role = await this.roleRepository.findOne({
            where: {id},
            relations: ['menus'], // 确保加载了 menus 关系
        });

        if (!role) {
            throw new NotFoundException(`未找到ID为 ${id} 的角色`);
        }

        // 2. 根据传入的 menuIds 查找所有对应的菜单实体
        // 使用 In 操作符可以高效地一次性查询多个ID
        // 3. 更新角色的 menus 关系
        // TypeORM 会自动处理中间表（sys_role_menu）的增删，非常智能
        role.menus = await this.menuRepository.findBy({
            id: In(menuIds),
        });

        // 4. 保存更新后的角色实体
        await this.roleRepository.save(role);
    }
}