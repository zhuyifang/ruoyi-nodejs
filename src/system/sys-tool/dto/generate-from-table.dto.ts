// src/sys-tool/dto/generate-from-table.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateFromTableDto {
    @ApiProperty({ description: '要生成代码的数据库表名', example: 'sys_product' })
    @IsString()
    @IsNotEmpty()
    tableName: string;

    @ApiProperty({
        description: "应用模块的目标插件目录。如果表名不是以 'sys_' 开头，此项必填。",
        example: 'cms',
        required: false,
    })
    @IsOptional()
    @IsString()
    pluginDir?: string;

    @ApiProperty({ description: '模块名 (小写，用-连接)，如果为空则从表名自动生成', example: 'sys-product', required: false })
    @IsOptional()
    @IsString()
    moduleName?: string;

    @ApiProperty({ description: '实体名 (PascalCase)，如果为空则从表名自动生成', example: 'SysProduct', required: false })
    @IsOptional()
    @IsString()
    entityName?: string;
}