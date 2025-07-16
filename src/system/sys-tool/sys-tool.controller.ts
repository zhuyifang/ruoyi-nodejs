// src/system/sys-tool/sys-tool.controller.ts

// 1. 移除了未使用的导入 (Get, Patch, Param, Delete, CreateSysToolDto, UpdateSysToolDto)
import { Controller, Post, Body, UseGuards, Get, Query, Delete, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SysToolService } from './sys-tool.service';
import { GenerateCodeDto } from './dto/generate-code.dto';
import { GenerateFromTableDto } from './dto/generate-from-table.dto';
// 2. 建议使用路径别名 '@/' 保持项目一致性
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { QueryGenTableDto } from './dto/query-gen-table.dto';

@Controller('sys-tool')
@UseGuards(AuthGuard('jwt'))
export class SysToolController {
  constructor(private readonly sysToolService: SysToolService) {}

  @Post('generate')
  // 3. 修正权限标识，使其与项目惯例和实际功能更匹配
  @RequirePermissions('system:tool:gen')
  generateCode(@Body() generateCodeDto: GenerateCodeDto) {
    return this.sysToolService.generate(generateCodeDto);
  }

  // 4. (可选但推荐) 统一路由和方法名，使其与服务层方法 generateFromTable 保持一致
  @Post('generate-from-table')
  @RequirePermissions('system:tool:gen')
  generateFromTable(@Body() dto: GenerateFromTableDto) {
    return this.sysToolService.generateFromTable(dto);
  }

  // 【修复】添加缺失的 GET /tables 路由
  @Get('tables')
  @RequirePermissions('system:tool:gen') // 重用代码生成权限
  listTables(@Query() queryDto: QueryGenTableDto) {
    return this.sysToolService.listTables(queryDto);
  }

  // 【新增】删除已生成代码的路由
  @Delete('delete-generated/:tableName')
  @RequirePermissions('system:tool:remove') // 使用新权限保护
  deleteGeneratedCode(@Param('tableName') tableName: string) {
    return this.sysToolService.deleteGeneratedCode(tableName);
  }
}