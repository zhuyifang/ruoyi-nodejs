// src/sys-role/sys-role.controller.ts
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
    Put,
    HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SysRoleService } from './sys-role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import {UpdateRoleMenusDto} from "./dto/update-role-menus.dto";

@Controller('sys-role')
@UseGuards(AuthGuard('jwt')) // 保护整个控制器下的所有路由
export class SysRoleController {
    constructor(private readonly sysRoleService: SysRoleService) {}

    @Post()
    create(@Body() createRoleDto: CreateRoleDto) {
        return this.sysRoleService.create(createRoleDto);
    }

    @Get()
    findAll() {
        return this.sysRoleService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.sysRoleService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateRoleDto: Partial<CreateRoleDto>) {
        return this.sysRoleService.update(id, updateRoleDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.sysRoleService.remove(id);
    }
    /**
     * 更新角色的菜单权限
     * @param id 角色ID
     * @param updateRoleMenusDto
     */
    @Put(':id/menus')
    @HttpCode(204) // 对于无返回内容的更新操作，204 No Content 是一个很好的状态码
    updateMenus(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateRoleMenusDto: UpdateRoleMenusDto,
    ) {
        return this.sysRoleService.updateMenus(id, updateRoleMenusDto.menuIds);
    }
}