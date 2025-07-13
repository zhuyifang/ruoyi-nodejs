// src/sys-user/sys-user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,ManyToMany,JoinTable } from 'typeorm';
import {SysRole} from "../sys-role/sys-role.entity";


@Entity('sys_user') // 明确指定表名为 'sys_users'
export class SysUser { // 类名改为 SysUser
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true, length: 50, comment: '用户名' })
    username: string;

    @Column({ length: 255, comment: '密码哈希值' })
    password: string;

    @Column({ unique: true, nullable: true, length: 100, comment: '邮箱' })
    email: string;

    @Column({ nullable: true, length: 20, comment: '手机号码' })
    phone: string;

    @Column({ default: true, comment: '是否启用：0-禁用，1-启用' })
    status: boolean;

    @CreateDateColumn({ comment: '创建时间' })
    createdAt: Date;

    @UpdateDateColumn({ comment: '更新时间' })
    updatedAt: Date;

    @Column({ length: 100, nullable: true, comment: '创建人' })
    createdBy: string;

    @Column({ length: 100, nullable: true, comment: '更新人' })
    updatedBy: string;

    @ManyToMany(() => SysRole, (role) => role.users)
    @JoinTable({
        name: 'sys_user_role', // 自定义中间表的名称
        joinColumn: { name: 'user_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
    })
    roles: SysRole[];
}