// src/sys-menu/sys-menu.controller.ts
import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SysMenuService } from './sys-menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';

@Controller('sys-menu')
@UseGuards(AuthGuard('jwt')) // 保护整个控制器
export class SysMenuController {
    constructor(private readonly sysMenuService: SysMenuService) {}

    @Post()
    create(@Body() createMenuDto: CreateMenuDto) {
        return this.sysMenuService.create(createMenuDto);
    }

    // 提供一个专门获取树形结构数据的接口
    @Get('tree')
    findTree() {
        return this.sysMenuService.findTree();
    }

    // 默认的 Get 接口返回扁平列表
    @Get()
    findAll() {
        return this.sysMenuService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.sysMenuService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateMenuDto: Partial<CreateMenuDto>,
    ) {
        return this.sysMenuService.update(id, updateMenuDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.sysMenuService.remove(id);
    }
}