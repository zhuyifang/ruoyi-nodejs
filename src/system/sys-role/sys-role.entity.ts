// src/sys-role/sys-role.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToMany,
    JoinTable,
} from 'typeorm';
import { SysUser } from '../sys-user/sys-user.entity';
import { SysMenu } from '../sys-menu/sys-menu.entity';

@Entity('sys_role')
export class SysRole {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 50, comment: '角色名称' })
    roleName: string;

    @Column({ unique: true, length: 50, comment: '角色权限字符串' })
    roleKey: string; // 例如 'admin', 'common'

    @Column({ default: true, comment: '角色状态：0-禁用，1-启用' })
    status: boolean;

    @Column({ type: 'text', nullable: true, comment: '备注' })
    remark: string;

    @CreateDateColumn({ comment: '创建时间' })
    createdAt: Date;

    @UpdateDateColumn({ comment: '更新时间' })
    updatedAt: Date;

    // 与用户的多对多关系
    @ManyToMany(() => SysUser, (user) => user.roles)
    users: SysUser[];

    // 与菜单的多对多关系
    @ManyToMany(() => SysMenu, (menu) => menu.roles)
    @JoinTable({
        name: 'sys_role_menu', // 自定义中间表的名称
        joinColumn: { name: 'role_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'menu_id', referencedColumnName: 'id' },
    })
    menus: SysMenu[];
}