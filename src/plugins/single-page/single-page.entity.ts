// src/single-page/single-page.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('plugin_single_page')
export class PluginSinglePage {
    @PrimaryGeneratedColumn()
    id: number;
    @Column({comment: '页面标题，唯一'})
    title: string;

    @Column({comment: '封面图URL'})
    coverImage: string;

    @Column({comment: '反面icon URL，可为空', nullable: true})
    backIcon: string;

    @Column({comment: '标签，逗号分割，可为空', nullable: true})
    tags: string;

    @Column({comment: '页面内容'})
    content: string;

    @Column({comment: '状态，例如：0-草稿，1-发布'})
    status: number;

    @CreateDateColumn({comment: '创建时间'})
    createdAt: Date;

    @UpdateDateColumn({comment: '更新时间'})
    updatedAt: Date;

    @Column({comment: '创建人ID', nullable: true})
    createdBy: number;

    @Column({comment: '最后更新人ID', nullable: true})
    updatedBy: number;
}