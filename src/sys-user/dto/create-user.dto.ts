// src/sys-user/dto/create-user.dto.ts
import { IsString, IsEmail, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class CreateUserDto {
    @IsString()
    @IsNotEmpty({ message: '用户名不能为空' })
    username: string;

    @IsString()
    @IsNotEmpty({ message: '密码不能为空' })
    @MinLength(6, { message: '密码长度不能少于6位' })
    password: string;

    @IsEmail({}, { message: '邮箱格式不正确' })
    @IsOptional() // 将 email 设为可选字段
    email?: string;
}