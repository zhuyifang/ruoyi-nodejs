// src/common/services/base.service.ts
import {
    FindManyOptions,
    FindOptionsOrder,
    Repository,
    ObjectLiteral,
    Like,
    FindOptionsWhere,
} from 'typeorm';
import { PaginationDto } from '../dto/pagination.dto';

/**
 * 一个通用的、可复用的服务基类，封装了分页、排序和动态查询逻辑。
 * 它能自动根据实体字段类型决定使用 LIKE 或 = 查询。
 * @template T 实体类型
 */
export abstract class BaseService<T extends ObjectLiteral> {
    protected constructor(private readonly repository: Repository<T>) {}

    /**
     * 通用的分页查询方法
     * @param paginationDto 分页和排序参数
     * @param queryDto 业务查询参数 DTO
     * @param options TypeORM 的查询选项，用于传入 relations 等
     * @param safeSortByFields 允许排序的字段白名单
     */
    async paginate<Q extends object>(
        paginationDto: PaginationDto,
        queryDto: Q,
        options: FindManyOptions<T> = {},
        safeSortByFields: string[] = ['id'],
    ): Promise<{ list: T[]; total: number }> {
        const { page = 1, limit = 10, sortBy, sortOrder } = paginationDto;
        const skip = (page - 1) * limit;

        // 1. 智能构建 Where 条件
        const where = this.buildWhere(queryDto);

        // 2. 构建 Order 条件
        const order = this.buildOrder(sortBy, sortOrder, safeSortByFields);

        // 3. 合并所有查询选项
        const findOptions: FindManyOptions<T> = {
            ...options,
            where,
            skip,
            take: limit,
            order,
        };

        const [list, total] = await this.repository.findAndCount(findOptions);
        return { list, total };
    }

    /**
     * 根据查询 DTO 和实体元数据，智能构建 TypeORM 的 Where 条件
     */
    private buildWhere<Q extends object>(queryDto: Q): FindOptionsWhere<T> {
        const where: FindOptionsWhere<T> = {};
        // 从 repository 获取当前实体的元数据
        const entityMetadata = this.repository.metadata;

        for (const key in queryDto) {
            // 检查 DTO 中是否存在该键，并且值不为 null 或 undefined 或空字符串
            if (queryDto[key] !== undefined && queryDto[key] !== null && queryDto[key] !== '') {
                // 查找与 DTO 键匹配的实体列元数据
                const column = entityMetadata.findColumnWithPropertyName(key);
                const value = queryDto[key];

                // 如果找到了对应的列元数据
                if (column) {
                    // 检查列的类型
                    // TypeORM 中，string 类型的列通常是 'varchar', 'text' 等，或者直接是 String 构造函数
                    if (column.type === String || (typeof column.type === 'string' && ['varchar', 'text', 'char'].includes(column.type))) {
                        (where as any)[key] = Like(`%${value}%`);
                    } else {
                        // 对于 number, boolean, Date 等其他所有类型，使用精确匹配
                        (where as any)[key] = value;
                    }
                }
            }
        }
        return where;
    }

    /**
     * 构建 TypeORM 的 Order 条件
     */
    private buildOrder(
        sortBy: string | undefined,
        sortOrder: 'ASC' | 'DESC' | undefined,
        safeSortByFields: string[],
    ): FindOptionsOrder<T> {
        const order: FindOptionsOrder<T> = {};
        if (sortBy && sortOrder && safeSortByFields.includes(sortBy)) {
            (order as any)[sortBy] = sortOrder;
        } else {
            (order as any)[safeSortByFields[0]] = 'DESC';
        }
        return order;
    }
}