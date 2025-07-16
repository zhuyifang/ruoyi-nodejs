import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SysToolService } from './sys-tool.service';
import { SysToolController } from './sys-tool.controller';
import { SysMenuModule } from '@/system/sys-menu/sys-menu.module';

@Module({
  imports: [TypeOrmModule.forFeature([]), SysMenuModule],
  controllers: [SysToolController],
  providers: [SysToolService],
})
export class SysToolModule {}