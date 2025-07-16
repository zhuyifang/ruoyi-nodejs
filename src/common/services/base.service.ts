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
      const entityMetadata = this.repository.metadata;
  
      for (const key in queryDto) {
        const value = queryDto[key];
  
        // 1. 忽略 undefined 和 null 的值
        if (value === undefined || value === null) {
          continue;
        }
  
        // 2. 对于字符串，额外忽略空字符串
        if (typeof value === 'string' && value.trim() === '') {
          continue;
        }
  
        const column = entityMetadata.findColumnWithPropertyName(key);
        if (column) {
          const isStringColumn = column.type === String || (typeof column.type === 'string' && ['varchar', 'text', 'char'].includes(column.type));
          
          (where as any)[key] = isStringColumn ? Like(`%${value}%`) : value;
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