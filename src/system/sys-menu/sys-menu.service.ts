// src/system/sys-menu/sys-menu.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SysMenu } from './sys-menu.entity';
import { CreateMenuDto } from './dto/create-menu.dto';

// [优化] 定义一个包含 children 的菜单节点接口，用于构建树形结构
// 这个接口将在控制器中作为返回类型，以确保类型安全
export interface MenuTreeNode extends SysMenu {
    children: MenuTreeNode[];
}

@Injectable()
export class SysMenuService {
    constructor(
        @InjectRepository(SysMenu)
        private readonly menuRepository: Repository<SysMenu>,
    ) {}

    /**
     * @description 将扁平的菜单列表构建成一个层级分明的树形结构
     * @param menus - 从数据库查询出的原始菜单列表
     * @returns 构建好的树形菜单
     */
    private buildMenuTree(menus: SysMenu[]): MenuTreeNode[] {
        const menuMap = new Map<number, MenuTreeNode>();
        const rootMenus: MenuTreeNode[] = [];

        // 第一轮遍历：初始化所有节点，确保每个节点都有 children 数组
        for (const menu of menus) {
            menuMap.set(menu.id, {
                ...menu,
                children: [], // [核心] 保证每个节点都有 children 属性
            });
        }

        // 第二轮遍历：构建父子关系
        for (const node of menuMap.values()) {
            if (node.parentId && menuMap.has(node.parentId)) {
                const parent = menuMap.get(node.parentId)!;
                parent.children.push(node);
            } else {
                // 否则，它是一个根节点
                rootMenus.push(node);
            }
        }

        // [核心修复] 直接返回构建好的树，不再删除叶子节点的 'children' 属性。
        // 这确保了数据结构的统一性，是前端正确渲染的关键。
        return rootMenus;
    }

    async create(createMenuDto: CreateMenuDto): Promise<SysMenu> {
        // 【建议】在创建前，可以增加对 parentId 是否存在的校验
        const menu = this.menuRepository.create(createMenuDto);
        return this.menuRepository.save(menu);
    }

    async findAll(): Promise<SysMenu[]> {
        // 【优化】按 orderNum 排序，确保同级菜单的显示顺序正确
        return this.menuRepository.find({ order: { orderNum: 'ASC' } });
    }

    async findTree(): Promise<MenuTreeNode[]> {
        const menus = await this.findAll();
        return this.buildMenuTree(menus);
    }

    async findOne(id: number): Promise<SysMenu> {
        const menu = await this.menuRepository.findOne({ where: { id } });
        if (!menu) {
            throw new NotFoundException(`未找到ID为 ${id} 的菜单`);
        }
        return menu;
    }

    async update(
        id: number,
        updateMenuDto: Partial<CreateMenuDto>,
    ): Promise<SysMenu> {
        const menu = await this.findOne(id);
        Object.assign(menu, updateMenuDto);
        return this.menuRepository.save(menu);
    }

    async remove(id: number): Promise<void> {
        // 【建议】在实际应用中，删除父菜单前应检查其是否包含子菜单
        const children = await this.menuRepository.count({ where: { parentId: id } });
        if (children > 0) {
            throw new Error('此菜单包含子菜单，无法直接删除');
        }
        const result = await this.menuRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`未找到ID为 ${id} 的菜单`);
        }
    }
}