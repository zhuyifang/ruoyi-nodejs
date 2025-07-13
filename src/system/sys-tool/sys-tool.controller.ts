// src/system/sys-tool/sys-tool.controller.ts

// 1. 移除了未使用的导入 (Get, Patch, Param, Delete, CreateSysToolDto, UpdateSysToolDto)
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SysToolService } from './sys-tool.service';
import { GenerateCodeDto } from './dto/generate-code.dto';
import { GenerateFromTableDto } from './dto/generate-from-table.dto';
// 2. 建议使用路径别名 '@/' 保持项目一致性
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';

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
}