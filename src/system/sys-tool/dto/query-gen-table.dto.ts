import { PaginationDto } from '@/common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class QueryGenTableDto extends PaginationDto {
  @ApiPropertyOptional({ description: '数据表名 (模糊查询)' })
  @IsOptional()
  @IsString()
  tableName?: string;

  @ApiPropertyOptional({ description: '表注释 (模糊查询)' })
  @IsOptional()
  @IsString()
  tableComment?: string;

  @ApiPropertyOptional({
    description: '生成状态',
    enum: ['true', 'false'],
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  isGenerated?: 'true' | 'false';
}