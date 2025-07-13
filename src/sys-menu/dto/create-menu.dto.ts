// src/sys-menu/dto/create-menu.dto.ts
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsIn,
    IsNumber,
    IsBoolean,
} from 'class-validator';

export class CreateMenuDto {
    @IsString()
    @IsNotEmpty({ message: '菜单名称不能为空' })
    name: string;

    @IsNumber({}, { message: '父菜单ID必须是数字' })
    @IsOptional()
    parentId?: number;

    @IsString()
    @IsOptional()
    path?: string;

    @IsString()
    @IsOptional()
    component?: string;

    @IsString()
    @IsOptional()
    perms?: string;

    @IsString()
    @IsOptional()
    icon?: string;

    @IsString()
    @IsNotEmpty()
    @IsIn(['M', 'C', 'F'], { message: '菜单类型不正确，必须是 M, C 或 F' })
    type: 'M' | 'C' | 'F';

    @IsBoolean()
    @IsOptional()
    status?: boolean;
}