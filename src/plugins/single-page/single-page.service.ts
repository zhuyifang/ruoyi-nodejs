// src/single-page/single-page.service.ts
import {Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository, In} from 'typeorm';
import {BaseService} from '@/common/services/base.service';
import {PaginationDto} from '@/common/dto/pagination.dto';
import {PluginSinglePage} from './single-page.entity';
import {CreatePluginSinglePageDto} from './dto/create-single-page.dto';
import {UpdatePluginSinglePageDto} from './dto/update-single-page.dto';
import {QueryPluginSinglePageDto} from './dto/query-single-page.dto';

@Injectable()
// 【修复】统一 Service 类名
export class PluginSinglePageService extends BaseService<PluginSinglePage> {
    private readonly safeSortByFields = ['title', 'coverImage', 'backIcon', 'tags', 'content', 'status', 'createdAt', 'updatedAt'];

    constructor(
        @InjectRepository(PluginSinglePage)
        private readonly singlePageRepository: Repository<PluginSinglePage>,
    ) {
        super(singlePageRepository);
    }

    async create(createDto: CreatePluginSinglePageDto): Promise<PluginSinglePage> {
        // 【修复】统一 Repository 变量名
        const entity = this.singlePageRepository.create(createDto);
        return this.singlePageRepository.save(entity);
    }

    async findAll(paginationDto: PaginationDto, queryDto: QueryPluginSinglePageDto): Promise<{ list: PluginSinglePage[], total: number }> {
        return this.paginate(paginationDto, queryDto, {}, this.safeSortByFields);
    }

    async findOne(id: number): Promise<PluginSinglePage> {
        // 【修复】统一 Repository 变量名
        const entity = await this.singlePageRepository.findOne({where: {id}});
        if (!entity) {
            throw new NotFoundException(`ID 为 ${id} 的记录未找到`);
        }
        return entity;
    }

    async update(id: number, updateDto: UpdatePluginSinglePageDto): Promise<PluginSinglePage> {
        const entityToUpdate = await this.findOne(id);
        Object.assign(entityToUpdate, updateDto);
        // 【修复】统一 Repository 变量名
        return this.singlePageRepository.save(entityToUpdate);
    }

    async remove(id: number): Promise<void> {
        // 【修复】统一 Repository 变量名
        const result = await this.singlePageRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`ID 为 ${id} 的记录未找到，无法删除`);
        }
    }

    async bulkRemove(ids: number[]): Promise<void> {
        if (!ids || ids.length === 0) {
            return;
        }
        // 【修复】统一 Repository 变量名
        const result = await this.singlePageRepository.delete({id: In(ids)} as any);
        if (result.affected === 0) {
            throw new NotFoundException(`提供的 ID 均未找到，无法删除`);
        }
    }
}