// src/sys-role/dto/create-role.dto.ts
import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateRoleDto {
    @IsString()
    @IsNotEmpty({ message: '角色名称不能为空' })
    name: string;

    @IsString()
    @IsNotEmpty({ message: '角色权限字符串不能为空' })
    roleKey: string;

    @IsBoolean()
    @IsOptional()
    status?: boolean;

    @IsString()
    @IsOptional()
    remark?: string;
}