// src/sys-user/dto/update-user-roles.dto.ts
import { IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserRolesDto {
    @ApiProperty({
        description: '角色ID列表',
        type: [Number],
        example: [1, 2],
    })
    @IsArray({ message: '角色ID列表必须是一个数组' })
    @IsNumber({}, { each: true, message: '角色ID必须是数字' })
    roleIds: number[];
}