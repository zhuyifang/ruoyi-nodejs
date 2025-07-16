// src/sys-user/sys-user.controller.ts
import {Controller, Get, Post, Body, UseGuards, Put, HttpCode, Param, ParseIntPipe, Query} from '@nestjs/common';
import {SysUserService} from './sys-user.service';
import {SysUser} from './sys-user.entity';
import {AuthGuard} from "@nestjs/passport";
import {UpdateUserRolesDto} from "./dto/update-user-roles.dto";
import {RequirePermissions} from '../../common/decorators/require-permissions.decorator';
import {CreateUserDto} from "./dto/create-user.dto";
import { PaginationDto } from '../../common/dto/pagination.dto';
import {QueryUserDto} from "./dto/query-user.dto"; // 2. 导入 PaginationDto

@Controller('sys-user') // 定义基础路由为 /sys-user
@UseGuards(AuthGuard('jwt'))
export class SysUserController {
    constructor(private readonly sysUserService: SysUserService) {
    }

    @Get() // GET /sys-user
    @RequirePermissions('system:user:list')
    findAll(@Query() paginationDto: PaginationDto,@Query()  queryDto : QueryUserDto,) { // 3. 使用 @Query 接收参数
        return this.sysUserService.findAll(paginationDto,queryDto);
    }

    @Post() // POST /sys-user
    @RequirePermissions('system:user:add')
    create(@Body() user: CreateUserDto): Promise<SysUser> {
        // 注意：这里为了演示方便直接接收了实体，
        // 最佳实践是使用 DTO (Data Transfer Object) 来验证和接收数据
        return this.sysUserService.create(user);
    }

    /**
     * 更新用户的角色
     * @param id 用户ID
     * @param updateUserRolesDto
     */
    @Put(':id/roles')
    @RequirePermissions('system:user:edit')
    updateRoles(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateUserRolesDto: UpdateUserRolesDto,
    ) {
        return this.sysUserService.updateRoles(id, updateUserRolesDto.roleIds);
    }
}