// src/single-page/dto/query-single-page.dto.ts
import {IsString, IsNumber, IsBoolean, IsDate, IsOptional} from 'class-validator';
import {Type} from 'class-transformer';
import {ApiPropertyOptional} from '@nestjs/swagger';

export class QueryPluginSinglePageDto {
    @ApiPropertyOptional({description: '页面标题，唯一'})
    @IsOptional() @IsString() title?: string;

    @ApiPropertyOptional({description: '封面图URL'})
    @IsOptional() @IsString() coverImage?: string;

    @ApiPropertyOptional({description: '反面icon URL，可为空'})
    @IsOptional() @IsString() backIcon?: string;

    @ApiPropertyOptional({description: '标签，逗号分割，可为空'})
    @IsOptional() @IsString() tags?: string;

    @ApiPropertyOptional({description: '页面内容'})
    @IsOptional() @IsString() content?: string;

    @ApiPropertyOptional({description: '状态，例如：0-草稿，1-发布'})
    @IsOptional() @Type(() => Number) @IsNumber() status?: number;
}