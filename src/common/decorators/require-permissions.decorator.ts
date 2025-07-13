// src/common/decorators/require-permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';

/**
 * 定义一个常量作为元数据的 Key，以避免硬编码字符串
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * @RequirePermissions() 装饰器，用于指定访问接口所需的权限标识
 * @param permissions 权限标识数组，例如: ['system:user:add', 'system:user:update']
 */
export const RequirePermissions = (...permissions: string[]) =>
    SetMetadata(PERMISSIONS_KEY, permissions);