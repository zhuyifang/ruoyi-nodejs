// src/system/sys-tool/sys-tool.service.ts
import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
// 【修复】从 typeorm 导入 IsNull
import { DataSource, IsNull } from 'typeorm';
import * as path from 'node:path';
import * as fs from 'fs/promises';
import * as Handlebars from 'handlebars';
import { capitalCase, camelCase, pascalCase } from 'change-case';
import { GenerateFromTableDto } from './dto/generate-from-table.dto';
import { GenerateCodeDto, FieldDto } from './dto/generate-code.dto';
import { SysMenuService } from '@/system/sys-menu/sys-menu.service';
import { CreateMenuDto } from '@/system/sys-menu/dto/create-menu.dto';
import { SysMenu } from '@/system/sys-menu/sys-menu.entity';

export interface MenuTreeNode extends SysMenu {
  name: string;
  children?: MenuTreeNode[];
}

@Injectable()
export class SysToolService implements OnModuleInit {
  private readonly logger = new Logger(SysToolService.name);
  private readonly templateDir = path.join(
      process.cwd(),
      'src',
      'system',
      'sys-tool',
      'sys-template',
      'crud',
  );

  constructor(
      @InjectDataSource() private readonly dataSource: DataSource,
      private readonly sysMenuService: SysMenuService,
  ) {}

  async onModuleInit() {
    Handlebars.registerHelper('eq', (a, b) => a === b);
    Handlebars.registerHelper('or', (a, b) => a || b);
    Handlebars.registerHelper('any', function (...args) {
      const _options = args.pop();
      return args.some(Boolean);
    });
    Handlebars.registerHelper('camelCase', (str) => camelCase(str));
    await this.registerPartials();
  }

  private async registerPartials() {
    try {
      const partialPath = path.join(this.templateDir, '_common-fields.hbs');
      const partialContent = await fs.readFile(partialPath, 'utf-8');
      Handlebars.registerPartial('_common-fields', partialContent);
      this.logger.log(
          'Successfully registered Handlebars partial: _common-fields',
      );
    } catch (error) {
      this.logger.error(
          'Failed to register Handlebars partials. Generation will likely fail.',
          error.stack,
      );
      throw new InternalServerErrorException(
          'Failed to initialize code generator templates.',
      );
    }
  }

  async generate(dto: GenerateCodeDto) {
    try {
      return await this.generateFiles(dto, 'system');
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`代码生成失败: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`代码生成失败: ${error.message}`);
    }
  }

  async generateFromTable(dto: GenerateFromTableDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const table = await queryRunner.getTable(dto.tableName);
      if (!table) {
        throw new NotFoundException(`数据表 '${dto.tableName}' 不存在`);
      }
      const isSystemTable = dto.tableName.startsWith('sys_');
      if (!isSystemTable && !dto.pluginDir) {
        throw new BadRequestException("对于非系统表，必须提供 'pluginDir' 字段。");
      }

      let moduleName: string;
      if (isSystemTable) {
        moduleName = dto.tableName.replace(/^sys_/, '').replace(/_/g, '-');
      } else {
        moduleName = dto.pluginDir!;
      }

      const entityName = pascalCase(dto.tableName);
      const modulePrefix = pascalCase(moduleName);
      const systemFields = [
        'id',
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
        'deleted_at',
      ];

      const fields: FieldDto[] = table.columns
          .filter((column) => !systemFields.includes(column.name.toLowerCase()))
          .map((column) => ({
            name: camelCase(column.name),
            type: this.mapDbTypeToTsType(column.type),
            comment: column.comment || '',
            isNullable: column.isNullable,
          }));

      const columnNames = new Set(
          table.columns.map((c) => c.name.toLowerCase()),
      );
      const hasTimestamps =
          columnNames.has('created_at') && columnNames.has('updated_at');
      const hasUserStamps =
          columnNames.has('created_by') && columnNames.has('updated_by');

      const templateContext: GenerateCodeDto & {
        hasTimestamps: boolean;
        hasUserStamps: boolean;
        modulePrefix: string;
        tableName: string;
      } = {
        moduleName,
        entityName,
        fields,
        hasTimestamps,
        hasUserStamps,
        modulePrefix,
        tableName: dto.tableName,
      };

      return this.generateFiles(
          templateContext,
          isSystemTable ? 'system' : 'application',
          dto.pluginDir,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`从表生成代码失败: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
          `从表生成代码失败: ${error.message}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  private mapDbTypeToTsType(
      dbType: string,
  ): 'string' | 'number' | 'boolean' | 'Date' {
    const lowerDbType = dbType.toLowerCase();

    const typeMappings = [
      { keys: ['int', 'integer', 'decimal', 'double', 'float', 'real', 'numeric'], type: 'number' as const },
      { keys: ['boolean', 'tinyint(1)', 'bit'], type: 'boolean' as const },
      { keys: ['datetime', 'timestamp', 'date'], type: 'Date' as const },
      { keys: ['varchar', 'text', 'char', 'string'], type: 'string' as const },
    ];

    for (const mapping of typeMappings) {
      if (mapping.keys.some((key) => lowerDbType.includes(key))) {
        return mapping.type;
      }
    }

    return 'string';
  }

  private pascalToTitleCase(str: string): string {
    const spaced = capitalCase(str);
    return spaced.replace(/^Sys /, '');
  }

  /**
   * 【已重构】为模块添加菜单，使其能生成与前端路由匹配的、正确的菜单项
   * @param moduleName 模块名 (e.g., 'order')
   * @param entityName 实体名 (e.g., 'Order')
   */
  private async addModuleToMenu(moduleName: string, entityName: string) {
    const menuRepository = this.dataSource.getRepository(SysMenu);

    // 1. 查找父级菜单，这里我们默认将其放在 "系统工具" 目录下
    const parentMenu = await menuRepository.findOne({
      where: { menuName: '系统工具', parentId: IsNull() },
    });

    if (!parentMenu) {
      this.logger.warn(
          `父级菜单 "系统工具" 未找到，跳过为模块 [${moduleName}] 创建菜单。`,
      );
      return;
    }

    // 2. 构造新菜单的 path 和 component，以匹配前端路由生成规则
    const menuPath = `/${moduleName}/${moduleName}`;
    const componentPath = `/${moduleName}/index`;

    // 3. 【幂等性校验】检查具有相同路径的菜单是否已存在
    const existingMenu = await menuRepository.findOne({
      where: { path: menuPath },
    });

    if (existingMenu) {
      this.logger.warn(`路径为 [${menuPath}] 的菜单已存在，跳过创建。`);
      return;
    }

    // 4. 【执行创建】创建 'C' 类型的菜单项
    const menuName = `${this.pascalToTitleCase(entityName)}管理`;
    const menuData: CreateMenuDto = {
      parentId: parentMenu.id,
      menuName: menuName,
      menuType: 'C', // C: 菜单
      orderNum: 0,
      path: menuPath, // 使用符合前端路由的完整路径
      status: true,
      visible: true,
      component: componentPath,
      perms: `app:${moduleName}:list`, // 为新模块添加默认的列表权限
    };

    await this.sysMenuService.create(menuData);
    this.logger.log(
        `成功在 [${parentMenu.menuName}] 下为模块 [${moduleName}] 创建菜单: ${menuName}`,
    );
  }

  private async generateFiles(
      context: GenerateCodeDto & {
        hasTimestamps?: boolean;
        hasUserStamps?: boolean;
        modulePrefix?: string;
        tableName?: string;
      },
      moduleType: 'system' | 'application',
      pluginDir?: string,
  ) {
    const { moduleName, entityName } = context;

    if (!/^[a-zA-Z0-9-_]+$/.test(moduleName)) {
      throw new BadRequestException('模块名包含非法字符');
    }

    let basePath: string;
    if (moduleType === 'system') {
      basePath = path.join(process.cwd(), 'src', 'system', moduleName);
    } else {
      if (!pluginDir) {
        throw new InternalServerErrorException('插件目录 (pluginDir) 未指定');
      }
      basePath = path.join(process.cwd(), 'src', 'plugins', pluginDir);
    }

    const allTemplateFiles = await fs.readdir(this.templateDir);

    for (const templateFile of allTemplateFiles) {
      if (!templateFile.endsWith('.hbs') || templateFile.startsWith('_')) {
        continue;
      }

      const templateContent = await fs.readFile(
          path.join(this.templateDir, templateFile),
          'utf-8',
      );
      const template = Handlebars.compile(templateContent);
      const renderedContent = template(context);

      let outputDir = basePath;
      let outputFileName = templateFile.replace('.hbs', '.ts');

      if (outputFileName.includes('-dto')) {
        outputDir = path.join(basePath, 'dto');
        outputFileName = outputFileName.replace('-dto', `-${moduleName}.dto`);
      } else {
        outputFileName = outputFileName.replace(
            path.basename(outputFileName, '.ts'),
            moduleName,
        );
      }

      const outputPath = path.join(outputDir, outputFileName);

      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, renderedContent);
      this.logger.log(`成功生成文件: ${outputPath}`);
    }

    // 只为应用模块 (非系统模块) 创建菜单
    if (moduleType === 'application') {
      await this.addModuleToMenu(moduleName, entityName);
    }

    return {
      message: `模块 ${moduleName} 已在 '${basePath}' 目录下成功生成！`,
    };
  }
}