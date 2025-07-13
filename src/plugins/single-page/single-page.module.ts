// src/single-page/single-page.module.ts
import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
// 【修复】使用 modulePrefix 统一导入
import {PluginSinglePageController} from './single-page.controller';
import {PluginSinglePageService} from './single-page.service';
// 【保持】实体类名仍然使用 entityName
import {PluginSinglePage} from './single-page.entity';

@Module({
    imports: [TypeOrmModule.forFeature([PluginSinglePage])],
    // 【修复】使用 modulePrefix 统一引用
    controllers: [PluginSinglePageController],
    providers: [PluginSinglePageService],
    exports: [PluginSinglePageService],
})
// 【修复】使用 modulePrefix 统一类名，并添加 "Plugin" 前缀
export class PluginSinglePageModule {
}