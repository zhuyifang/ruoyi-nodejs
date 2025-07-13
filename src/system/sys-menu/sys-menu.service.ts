// src/sys-menu/sys-menu.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SysMenu } from './sys-menu.entity';
import { CreateMenuDto } from './dto/create-menu.dto';

type MenuTreeNode = SysMenu & { children: MenuTreeNode[] };

@Injectable()
export class SysMenuService {
    constructor(
        @InjectRepository(SysMenu)
        private readonly menuRepository: Repository<SysMenu>,
    ) {}

    /**
     * 将扁平的菜单列表构建成树形结构
     * @param menus 菜单列表
     * @returns 树形结构的菜单
     */
    private buildTree(menus: SysMenu[]): any[] {
        const menuMap = new Map<number, any>();
        const tree:MenuTreeNode[] = [];

        // 1. 将所有菜单放入 Map，并添加 children 属性
        menus.forEach((menu) => {
            menuMap.set(menu.id, { ...menu, children: [] });
        });

        // 2. 遍历菜单，构建父子关系
        menus.forEach((menu) => {
            const node = menuMap.get(menu.id);
            if (menu.parentId && menuMap.has(menu.parentId)) {
                // 如果有父节点，则将当前节点添加到父节点的 children 数组中
                menuMap.get(menu.parentId).children.push(node);
            } else {
                // 如果没有父节点，则为根节点
                tree.push(node);
            }
        });

        return tree;
    }

    async create(createMenuDto: CreateMenuDto): Promise<SysMenu> {
        const menu = this.menuRepository.create(createMenuDto);
        return this.menuRepository.save(menu);
    }

    async findAll(): Promise<SysMenu[]> {
        // 按 parentId 和 id 排序，以确保树构建的顺序正确
        return this.menuRepository.find({ order: { parentId: 'ASC', id: 'ASC' } });
    }

    async findTree(): Promise<any[]> {
        const menus = await this.findAll();
        return this.buildTree(menus);
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
        // 注意：在实际应用中，删除父菜单前应检查其是否包含子菜单
        const result = await this.menuRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`未找到ID为 ${id} 的菜单`);
        }
    }
}