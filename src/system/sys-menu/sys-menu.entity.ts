// src/system/sys-menu/sys-menu.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToMany,
} from 'typeorm';
import { SysRole } from '../sys-role/sys-role.entity';

@Entity('sys_menu')
export class SysMenu {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 50, comment: '菜单名称' })
    menuName: string;

    // 【关键修复】在 @Column 装饰器中明确指定数据库类型为 'int'
    @Column({ type: 'int', nullable: true, comment: '父菜单ID' })
    parentId: number | null;

    @Column({ type: 'int', default: 0, comment: '显示顺序' })
    orderNum: number;

    @Column({ nullable: true, comment: '路由地址' })
    path: string;

    @Column({ nullable: true, comment: '组件路径' })
    component: string;

    @Column({ nullable: true, comment: '权限标识' })
    perms: string;

    @Column({ nullable: true, comment: '菜单图标' })
    icon: string;

    @Column({
        type: 'varchar',
        length: 1,
        comment: '菜单类型：M-目录，C-菜单，F-按钮',
    })
    menuType: 'M' | 'C' | 'F';

    @Column({ default: true, comment: '菜单是否可见 (true显示 false隐藏)' })
    visible: boolean;

    @Column({ default: true, comment: '菜单状态 (true正常 false停用)' })
    status: boolean;

    @CreateDateColumn({ comment: '创建时间' })
    createdAt: Date;

    @UpdateDateColumn({ comment: '更新时间' })
    updatedAt: Date;

    @ManyToMany(() => SysRole, (role) => role.menus)
    roles: SysRole[];
}