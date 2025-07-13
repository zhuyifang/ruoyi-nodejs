import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsIn,
    IsNumber,
    IsBoolean,
} from 'class-validator';

/**
 * 创建菜单的 DTO
 */
export class CreateMenuDto {
    @ApiProperty({ description: '父菜单ID', example: 0 })
    @IsNumber({}, { message: '父菜单ID必须是数字' })
    parentId: number;

    @ApiProperty({ description: '菜单名称', example: '用户管理' })
    @IsString()
    @IsNotEmpty({ message: '菜单名称不能为空' })
    menuName: string;

    @ApiProperty({
        description: '菜单类型 (M目录 C菜单 F按钮)',
        enum: ['M', 'C', 'F'],
        example: 'M',
    })
    @IsNotEmpty()
    @IsIn(['M', 'C', 'F'], { message: '菜单类型不正确，必须是 M, C 或 F' })
    menuType: 'M' | 'C' | 'F';

    @ApiPropertyOptional({ description: '显示顺序', example: 1 })
    @IsNumber({}, { message: '显示顺序必须是数字' })
    @IsOptional()
    orderNum?: number;

    @ApiPropertyOptional({ description: '路由地址', example: 'user' })
    @IsString()
    @IsOptional()
    path?: string;

    @ApiPropertyOptional({
        description: '组件路径',
        example: 'system/user/index',
    })
    @IsString()
    @IsOptional()
    component?: string;

    @ApiPropertyOptional({
        description: '权限标识',
        example: 'system:user:list',
    })
    @IsString()
    @IsOptional()
    perms?: string;

    @ApiPropertyOptional({ description: '菜单图标', example: 'user' })
    @IsString()
    @IsOptional()
    icon?: string;

    @ApiPropertyOptional({
        description: '菜单状态 (true正常 false停用)',
        example: true,
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    status?: boolean;

    @ApiPropertyOptional({
        description: '是否显示 (true显示 false隐藏)',
        example: true,
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    visible?: boolean;
}