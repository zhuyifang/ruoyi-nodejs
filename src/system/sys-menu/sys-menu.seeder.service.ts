// src/system/sys-menu/sys-menu.seeder.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
// 1. 从 typeorm 导入 IsNull 和 FindOptionsWhere
import { Repository, IsNull, FindOptionsWhere } from 'typeorm';
import { SysMenu } from './sys-menu.entity';

@Injectable()
export class SysMenuSeederService {
    private readonly logger = new Logger(SysMenuSeederService.name);

    constructor(
        @InjectRepository(SysMenu)
        private readonly menuRepository: Repository<SysMenu>,
    ) {}

    /**
     * 查找或创建菜单。如果菜单已存在，则根据新数据进行更新，确保数据与代码同步。
     * @param menuData 菜单数据
     * @returns 创建或更新后的菜单实体
     */
    private async findOrCreate(menuData: Partial<SysMenu>): Promise<SysMenu> {
        // 2. 【关键修复】构造一个符合 TypeORM 要求的查询条件
        const where: FindOptionsWhere<SysMenu> = {
            menuName: menuData.menuName,
            // 如果 menuData.parentId 存在 (不为 null 或 undefined)，则使用其值；
            // 否则，使用 IsNull() 操作符来查询数据库中为 NULL 的记录。
            parentId: menuData.parentId === null ? IsNull() : menuData.parentId,
        };

        const existingMenu = await this.menuRepository.findOne({ where });

        if (existingMenu) {
            // 如果菜单已存在，使用 merge 更新其数据以匹配最新代码
            this.menuRepository.merge(existingMenu, menuData);
            return this.menuRepository.save(existingMenu);
        }

        // 如果菜单不存在，则创建新菜单
        this.logger.log(`Creating menu: ${menuData.menuName}`);
        const newMenu = this.menuRepository.create(menuData);
        return this.menuRepository.save(newMenu);
    }

    /**
     * 运行菜单数据填充，并返回所有菜单
     * @returns {Promise<SysMenu[]>} 所有被创建或找到的菜单实体数组
     */
    async seed(): Promise<SysMenu[]> {
        this.logger.log('Start seeding menus...');
        const allMenus: SysMenu[] = [];

        // 辅助函数，用于简化菜单创建和收集过程
        const createAndCollect = async (menuData: Partial<SysMenu>) => {
            const menu = await this.findOrCreate(menuData);
            allMenus.push(menu);
            return menu;
        };

        // =================================================================
        // 1. 创建顶级目录：系统管理
        // =================================================================
        const systemManagement = await createAndCollect({
            menuName: '系统管理',
            path: '/system',
            component: 'Layout',
            menuType: 'M', // M: 目录
            status: true,
            visible: true,
            parentId: null, // 顶级目录的 parentId 为 null
        });

        // =================================================================
        // 2. 在“系统管理”下创建菜单
        // =================================================================

        // 2.1 用户管理
        const userMenu = await createAndCollect({
            parentId: systemManagement.id,
            menuName: '用户管理',
            path: 'user',
            component: 'system/user/index',
            menuType: 'C', // C: 菜单
            perms: 'system:user:list', // 列表权限
            status: true,
            visible: true,
        });

        // 2.2 角色管理
        const roleMenu = await createAndCollect({
            parentId: systemManagement.id,
            menuName: '角色管理',
            path: 'role',
            component: 'system/role/index',
            menuType: 'C',
            perms: 'system:role:list',
            status: true,
            visible: true,
        });

        // 2.3 菜单管理
        const menuMenu = await createAndCollect({
            parentId: systemManagement.id,
            menuName: '菜单管理',
            path: 'menu',
            component: 'system/menu/index',
            menuType: 'C',
            perms: 'system:menu:list',
            status: true,
            visible: true,
        });

        // =================================================================
        // 3. 创建顶级目录：系统工具
        // =================================================================
        const systemTool = await createAndCollect({
            menuName: '系统工具',
            path: '/tool',
            component: 'Layout',
            menuType: 'M',
            status: true,
            visible: true,
            parentId: null,
        });

        // 3.1 代码生成
        const genMenu = await createAndCollect({
            parentId: systemTool.id,
            menuName: '代码生成',
            path: 'gen',
            component: 'tool/gen/index',
            menuType: 'C',
            perms: 'system:tool:gen', // 代码生成权限
            status: true,
            visible: true,
        });

        this.logger.log('Seeding menus finished.');
        return allMenus;
    }
}