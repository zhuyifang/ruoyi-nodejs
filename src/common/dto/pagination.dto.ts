// src/common/dto/pagination.dto.ts
import { Type } from 'class-transformer';
import {IsInt, Min, IsOptional, IsString, IsIn} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
    @ApiPropertyOptional({
        description: '页码，从 1 开始',
        default: 1,
        type: Number,
    })
    @IsOptional()
    @Type(() => Number) // 将传入的字符串转换为数字
    @IsInt({ message: '页码必须是整数' })
    @Min(1, { message: '页码不能小于1' })
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    pageSize?: number;

    @ApiPropertyOptional({
        description: '每页数量',
        default: 10,
        type: Number,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: '每页数量必须是整数' })
    @Min(1, { message: '每页数量不能小于1' })
    limit?: number = 10;

    @ApiPropertyOptional({
        description: '排序字段',
        example: 'id',
        type: String,
    })
    @IsOptional()
    @IsString()
    sortBy?: string;

    @ApiPropertyOptional({
        description: '排序顺序',
        enum: ['ASC', 'DESC'],
        default: 'DESC',
    })
    @IsOptional()
    @IsIn(['ASC', 'DESC'], { message: '排序顺序只能是 ASC 或 DESC' })
    sortOrder?: 'ASC' | 'DESC';
}