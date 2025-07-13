// src/sys-role/dto/query.dto.ts
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryUserDto {
    @ApiPropertyOptional({ description: '用户名，用于模糊查询' })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiPropertyOptional({ description: '邮箱，用于模糊查询' })
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional({ description: '用户状态' })
    @IsOptional()
    @Type(() => Boolean) // 将 "true" 或 "false" 字符串转为布尔值
    @IsBoolean()
    status?: boolean;
}