// src/system/sys-menu/sys-menu.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SysMenu } from './sys-menu.entity';
import { CreateMenuDto } from './dto/create-menu.dto';

/**
 * @description 定义返回给前端的树节点接口
 * - 继承自 SysMenu，确保所有原有字段都存在
 * - 添加了前端需要的 'name' 字段
 * - 将 'children' 属性设为可选，因为叶子节点没有此属性
 */
export interface MenuTreeNode extends SysMenu {
    name: string;
    children?: MenuTreeNode[];
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

        // 第一轮遍历：初始化所有节点，并进行字段映射
        for (const menu of menus) {
            const treeNode: MenuTreeNode = {
                ...menu,
                name: menu.menuName, // 【优化】将后端的 menuName 映射为前端需要的 name
                children: [], // 初始化 children 数组
            };
            menuMap.set(menu.id, treeNode);
        }

        // 第二轮遍历：构建父子关系
        for (const treeNode of menuMap.values()) {
            if (treeNode.parentId && menuMap.has(treeNode.parentId)) {
                const parentNode = menuMap.get(treeNode.parentId)!;

                // 【修正】增加一个防御性检查，以满足 TypeScript 的严格类型检查
                // 这能确保我们只在 children 数组确实存在时才执行 push 操作
                if (parentNode.children) {
                    parentNode.children.push(treeNode);
                }

            } else {
                // 否则，它是一个根节点
                rootMenus.push(treeNode);
            }
        }

        // 【优化】递归清理空的 children 数组，使返回的 JSON 更干净
        const cleanupEmptyChildren = (nodes: MenuTreeNode[]) => {
            for (const node of nodes) {
                if (node.children && node.children.length > 0) {
                    cleanupEmptyChildren(node.children);
                } else {
                    // 如果 children 数组为空或不存在，则删除该属性
                    delete node.children;
                }
            }
        };

        cleanupEmptyChildren(rootMenus);

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