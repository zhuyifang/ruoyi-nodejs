// src/sys-tool/dto/generate-code.dto.ts
import { IsString, IsNotEmpty, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

// 定义单个字段的类型
export class FieldDto {
    @IsString()
    @IsNotEmpty()
    name: string; // 字段名, e.g., 'title'

    @IsString()
    @IsIn(['string', 'number', 'boolean', 'Date']) // 限制合法的类型
    type: 'string' | 'number' | 'boolean' | 'Date'; // 字段类型

    @IsString()
    @IsNotEmpty()
    comment: string; // 字段注释

    isNullable?: boolean;
}

export class GenerateCodeDto {
    @IsString({ message: '模块名必须是字符串' })
    @IsNotEmpty({ message: '模块名不能为空' })
        // e.g., "product" -> 会生成 src/product 目录
    moduleName: string;

    @IsString()
    @IsNotEmpty()
        // e.g., "Product" -> 会生成 ProductService, ProductController
    entityName: string;

    @IsArray()
    @ValidateNested({ each: true }) // 验证数组中的每一个对象
    @Type(() => FieldDto)
    fields: FieldDto[];
}