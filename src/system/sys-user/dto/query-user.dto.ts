// src/sys-role/dto/query.dto.ts
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
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
    // 【核心修复】使用 @Transform 进行精确的布尔值转换。
    // URL 查询参数 'true' 和 'false' 都是字符串。@Type(() => Boolean) 会将任何非空字符串（包括 "false"）都转为 true。
    // 我们必须自定义转换逻辑，明确地将字符串 'true' 映射为布尔值 true。
    @Transform(({ value }) => value === 'true')
    @IsBoolean()
    status?: boolean;
}