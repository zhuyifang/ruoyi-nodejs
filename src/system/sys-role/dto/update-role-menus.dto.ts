// src/sys-role/dto/update-role-menus.dto.ts
import { IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // 推荐安装 @nestjs/swagger 用于 API 文档

export class UpdateRoleMenusDto {
    @ApiProperty({
        description: '菜单ID列表',
        type: [Number],
        example: [1, 2, 3],
    })
    @IsArray({ message: '菜单ID列表必须是一个数组' })
    @IsNumber({}, { each: true, message: '菜单ID必须是数字' })
    menuIds: number[];
}