// src/sys-menu/sys-menu.entity.ts
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
    name: string;

    @Column({ nullable: true, comment: '父菜单ID' })
    parentId: number;

    @Column({ nullable: true, comment: '路由地址' })
    path: string;

    @Column({ nullable: true, comment: '组件路径' })
    component: string;

    @Column({ nullable: true, comment: '权限标识' })
    perms: string; // 例如 'system:user:list', 'system:user:add'

    @Column({ nullable: true, comment: '菜单图标' })
    icon: string;

    @Column({
        type: 'varchar',
        length: 1,
        comment: '菜单类型：M-目录，C-菜单，F-按钮',
    })
    type: 'M' | 'C' | 'F';

    @Column({ default: true, comment: '菜单状态：0-禁用，1-启用' })
    status: boolean;

    @CreateDateColumn({ comment: '创建时间' })
    createdAt: Date;

    @UpdateDateColumn({ comment: '更新时间' })
    updatedAt: Date;

    // 与角色的多对多关系
    @ManyToMany(() => SysRole, (role) => role.menus)
    roles: SysRole[];
}