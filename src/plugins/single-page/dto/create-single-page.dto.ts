// src/single-page/dto/create-single-page.dto.ts
import {IsString, IsNumber, IsBoolean, IsDate, IsNotEmpty, IsOptional} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';

export class CreatePluginSinglePageDto {
    @ApiProperty({description: '页面标题，唯一'})
    @IsNotEmpty({message: '页面标题，唯一 不能为空'})
    @IsString() title: string;

    @ApiProperty({description: '封面图URL'})
    @IsNotEmpty({message: '封面图URL 不能为空'})
    @IsString() coverImage: string;

    @ApiProperty({description: '反面icon URL，可为空', required: false, nullable: true})
    @IsOptional()
    @IsString() backIcon?: string;

    @ApiProperty({description: '标签，逗号分割，可为空', required: false, nullable: true})
    @IsOptional()
    @IsString() tags?: string;

    @ApiProperty({description: '页面内容'})
    @IsNotEmpty({message: '页面内容 不能为空'})
    @IsString() content: string;

    @ApiProperty({description: '状态，例如：0-草稿，1-发布'})
    @IsNotEmpty({message: '状态，例如：0-草稿，1-发布 不能为空'})
    @IsNumber() status: number;
}