// src/single-page/single-page.controller.ts
import {Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, HttpCode, Query} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';
import {RequirePermissions} from '@/common/decorators/require-permissions.decorator';
import {PluginSinglePageService} from './single-page.service';
import {CreatePluginSinglePageDto} from './dto/create-single-page.dto';
import {UpdatePluginSinglePageDto} from './dto/update-single-page.dto';
import {DeletePluginSinglePageDto} from './dto/delete-single-page.dto';
import {PaginationDto} from '@/common/dto/pagination.dto';
import {QueryPluginSinglePageDto} from './dto/query-single-page.dto';

@Controller('/plugins/single-page')
@UseGuards(AuthGuard('jwt'))
// 【修复】统一 Controller 类名
export class PluginSinglePageController {
    constructor(private readonly service: PluginSinglePageService) {
    }

    @Post()
    // @RequirePermissions('plugin:single-page:add')
    create(@Body() createDto: CreatePluginSinglePageDto) {
        return this.service.create(createDto);
    }

    @Get()
    // @RequirePermissions('plugin:single-page:list')
    findAll(@Query() paginationDto: PaginationDto, @Query() queryDto: QueryPluginSinglePageDto) {
        return this.service.findAll(paginationDto, queryDto);
    }

    @Get(':id')
    // @RequirePermissions('plugin:single-page:query')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.service.findOne(id);
    }

    @Patch(':id')
    // @RequirePermissions('plugin:single-page:edit')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdatePluginSinglePageDto) {
        return this.service.update(id, updateDto);
    }

    @Delete(':id')
    @HttpCode(204)
    // @RequirePermissions('plugin:single-page:remove')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.service.remove(id);
    }

    @Delete()
    @HttpCode(204)
    // @RequirePermissions('plugin:single-page:remove')
    bulkRemove(@Body() deleteDto: DeletePluginSinglePageDto) {
        return this.service.bulkRemove(deleteDto.ids);
    }
}