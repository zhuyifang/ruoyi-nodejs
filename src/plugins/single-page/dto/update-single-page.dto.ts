// src/single-page/dto/update-single-page.dto.ts
import {IsString, IsNumber, IsBoolean, IsDate, IsOptional} from 'class-validator';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {Type} from 'class-transformer';

export class UpdatePluginSinglePageDto {
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
    @IsOptional() @IsNumber() status?: number;
}