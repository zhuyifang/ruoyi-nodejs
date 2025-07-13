// src/core/plugin-loader/plugin-loader.module.ts

import { DynamicModule, Logger, Module, Type } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { pascalCase } from 'change-case';

// 【终极技巧】
// 创建一个辅助函数，它可以在运行时执行一个真正的、原生的动态 import()。
// new Function() 中的代码不会被 TypeScript 编译器在编译时检查或转换，
// 从而完美地绕过了 "import() -> require()" 的问题。
const nativeImport = (modulePath: string): Promise<any> =>
    new Function('modulePath', 'return import(modulePath);')(modulePath);

@Module({})
export class PluginLoaderModule {
  private static readonly logger = new Logger(PluginLoaderModule.name);

  static async forRootAsync(): Promise<DynamicModule> {
    const pluginsSrcDir = path.join(process.cwd(), 'src', 'plugins');
    const pluginsDistDir = path.join(process.cwd(), 'dist', 'plugins');

    const loadedModules: Type<any>[] = [];

    try {
      if (!(await fs.pathExists(pluginsSrcDir))) {
        this.logger.warn(`插件源目录未找到: ${pluginsSrcDir}。正在跳过插件加载。`);
        return { module: PluginLoaderModule, imports: [] };
      }

      const pluginDirs = await fs.readdir(pluginsSrcDir);

      for (const dirName of pluginDirs) {
        if (dirName.startsWith('_')) {
          this.logger.log(`跳过被禁用的插件目录: ${dirName}`);
          continue;
        }

        const dirPath = path.join(pluginsSrcDir, dirName);
        const stat = await fs.stat(dirPath);

        if (stat.isDirectory()) {
          const modulePath = path.join(
              pluginsDistDir,
              dirName,
              `${dirName}.module.js`,
          );

          if (await fs.pathExists(modulePath)) {
            try {
              // 依然转换为 file URL，这是原生 import() 所需的。
              const moduleUrl = pathToFileURL(modulePath).href;

              // 【关键修复】使用我们的原生导入辅助函数
              const moduleExports = await nativeImport(moduleUrl);

              const moduleClassName = `Plugin${pascalCase(dirName)}Module`;
              const pluginModule = moduleExports[moduleClassName];

              if (pluginModule) {
                loadedModules.push(pluginModule);
                this.logger.log(`成功加载插件: ${dirName}`);
              } else {
                this.logger.error(
                    `在 ${modulePath} 中找不到导出的模块 '${moduleClassName}'`,
                );
              }
            } catch (error) {
              this.logger.error(`从 ${dirName} 加载插件模块失败`, error.stack);
              console.error(`加载模块 [${dirName}] 失败的详细错误:`, error);
            }
          } else {
            this.logger.warn(
                `插件 [${dirName}] 的已编译模块文件未找到，路径: ${modulePath}`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('插件扫描期间发生错误', error.stack);
    }

    return {
      module: PluginLoaderModule,
      imports: loadedModules,
      global: true,
    };
  }
}