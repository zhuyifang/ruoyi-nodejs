// src/sys-role/dto/query-role.dto.ts
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryRoleDto {
    @ApiPropertyOptional({ description: '角色名称，用于模糊查询' })
    @IsOptional()
    @IsString()
    roleName?: string;

    @ApiPropertyOptional({ description: '角色状态' })
    @IsOptional()
    @Type(() => Boolean) // 将 "true" 或 "false" 字符串转为布尔值
    @IsBoolean()
    status?: boolean;
}