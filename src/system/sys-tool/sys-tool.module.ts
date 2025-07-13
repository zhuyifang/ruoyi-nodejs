import { Module } from '@nestjs/common';
import { SysToolService } from './sys-tool.service';
import { SysToolController } from './sys-tool.controller';
import { SysMenuModule } from '@/system/sys-menu/sys-menu.module'; // 1. 导入 SysMenuModule

@Module({
  imports: [SysMenuModule], // 2. 将 SysMenuModule 添加到 imports 数组
  controllers: [SysToolController],
  providers: [SysToolService],
})
export class SysToolModule {}