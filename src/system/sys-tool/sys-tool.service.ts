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
    // 【修复】将助记符 'eq' 重命名为 'isEq'，以匹配模板中的用法
    Handlebars.registerHelper('isEq', (a, b) => a === b);
    Handlebars.registerHelper('or', (a, b) => a || b);
    Handlebars.registerHelper('isMember', (item, listString) => {
      if (typeof listString !== 'string') return false;
      const list = listString.split(',').map((s) => s.trim());
      return list.includes(item);
    });
    // 【架构升级】注册一个自定义辅助函数，以编程方式生成格式完美的 @Column 装饰器选项。
    // 这可以从根本上解决模板中因条件逻辑而产生的多余空行和格式问题。
    Handlebars.registerHelper('buildColOpts', function (column) {
      // 【修复】明确指定 options 数组的类型为 string[]，以解决 TS2345 (Argument of type 'string' is not assignable to 'never') 错误
      const options: string[] = [];
      options.push(`type: '${column.columnType}'`);

      // 服务层已将空的 length 转换为了 null
      if (column.length !== null) {
        options.push(`length: ${column.length}`);
      }
      if (column.isNullable) {
        options.push(`nullable: true`);
      }

      const escapedComment = column.comment.replace(/'/g, "\\'");
      options.push(`comment: '${escapedComment}'`);

      return new Handlebars.SafeString(`{\n        ${options.join(',\n        ')}\n    }`);
    });
    // 【终极架构升级】注册一个更强大的辅助函数，用于生成所有DTO的验证装饰器。
    // 这将复杂的条件逻辑从模板中完全移除，并以编程方式保证完美的输出格式。
    Handlebars.registerHelper(
      'buildValidationDecorators',
      function (column, context) {
        const decorators: string[] = [];
        const indent = '    ';

        // 1. ApiProperty & Nullability
        if (context === 'create') {
          const required = column.isNullable ? ', required: false' : '';
          decorators.push(
            `@ApiProperty({ description: '${column.comment}'${required} })`,
          );
          if (column.isNullable) {
            decorators.push(`@IsOptional()`);
          } else {
            decorators.push(`@IsNotEmpty({ message: '${column.comment} 不能为空' })`);
          }
        } else {
          // For 'update' and 'query' contexts
          decorators.push(
            `@ApiPropertyOptional({ description: '${column.comment}' })`,
          );
          decorators.push(`@IsOptional()`);
        }

        // 2. Type Validation & Transformation
        const type = column.dataType;
        if (type === 'boolean') {
          if (context === 'query') {
            decorators.push(`@Transform(({ value }) => value === 'true')`);
          }
          decorators.push(`@IsBoolean()`);
        } else if (type === 'number') {
          if (context === 'query') decorators.push(`@Type(() => Number)`);
          decorators.push(`@IsNumber()`);
        } else if (type === 'date') {
          decorators.push(`@Type(() => Date)`);
          decorators.push(`@IsDate()`);
        } else {
          decorators.push(`@IsString()`);
        }

        return new Handlebars.SafeString(decorators.join(`\n${indent}`));
      },
    );
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
      // 【修复】手动生成时，需要将 dto.fields 转换为模板期望的 columns 结构
      const templateContext = {
        ...dto,
        modulePrefix: pascalCase(dto.moduleName),
        tableName: dto.moduleName.replace(/-/g, '_'), // 最佳猜测
        hasTimestamps: false, // 手动生成时不假定有时间戳
        hasUserStamps: false, // 手动生成时不假定有用户戳
        columns: dto.fields.map((field) => ({
          isPrimary: false, // 手动生成时假定非主键
          columnName: field.name,
          propertyType: field.type,
          dataType: field.type.toLowerCase(),
          columnType: 'unknown',
          length: null,
          isNullable: field.isNullable,
          comment: field.comment,
        })),
      };
      delete (templateContext as any).fields;

      return await this.generateFiles(templateContext as any, 'system');
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

      // 【终极调试】打印出 TypeORM 实际从数据库读取到的表结构。
      // 这将明确告诉我们，在运行时，代码生成器“看到”了什么。
      this.logger.debug(
          `[代码生成器调试] 发现表 '${dto.tableName}'，其结构为: ${JSON.stringify(table, null, 2)}`,
      );

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

      const columns = table.columns.map((column) => {
        const { propertyType, dataType } = this.mapDbColumnToTypeInfo(column);
        return {
          isPrimary: column.isPrimary,
          columnName: camelCase(column.name),
          propertyType,
          dataType,
          columnType: column.type,
          // 【修复】确保当 length 为空字符串时，其值为 null，以避免在模板中出现 "length: ," 的语法错误
          length: column.length ? column.length : null,
          isNullable: column.isNullable,
          comment: column.comment || '',
        };
      });

      const columnNames = new Set(
          table.columns.map((c) => c.name.toLowerCase()),
      );
      // 【修复】检查 'createdat' (小写驼峰) 而不是 'created_at' (蛇形)，以匹配实际的列名
      const hasTimestamps =
          columnNames.has('createdat') && columnNames.has('updatedat');
      // 【修复】同上，检查 'createdby'
      const hasUserStamps =
          columnNames.has('createdby') && columnNames.has('updatedby');

      const templateContext = {
        moduleName,
        entityName,
        columns,
        hasTimestamps,
        hasUserStamps,
        modulePrefix,
        tableName: dto.tableName,
      };

      return this.generateFiles(
          templateContext as any, // 转换为 any 以绕过对 generate() 方法的类型检查
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

  private mapDbColumnToTypeInfo(column: {
    type: string;
  }): { propertyType: string; dataType: string } {
    const dbType = column.type.toLowerCase();

    if (
      ['int', 'integer', 'decimal', 'double', 'float', 'real', 'numeric'].some(
        (k) => dbType.includes(k),
      )
    ) {
      return { propertyType: 'number', dataType: 'number' };
    }
    if (['boolean', 'tinyint(1)', 'bit'].some((k) => dbType.includes(k))) {
      return { propertyType: 'boolean', dataType: 'boolean' };
    }
    if (['datetime', 'timestamp', 'date'].some((k) => dbType.includes(k))) {
      return { propertyType: 'Date', dataType: 'date' };
    }
    if (['json', 'jsonb'].some((k) => dbType.includes(k))) {
      return { propertyType: 'object', dataType: 'json' };
    }
    if (dbType.includes('text')) {
      return { propertyType: 'string', dataType: 'text' };
    }
    return { propertyType: 'string', dataType: 'string' };
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
      context: {
        moduleName: string;
        entityName: string;
        columns: any[];
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

    // 【核心修复】定义一个固定的、符合逻辑依赖的生成顺序。
    // 这可以从根本上解决因文件生成顺序不确定而导致的 "Cannot find module" 编译错误（竞态条件）。
    const generationOrder = [
      'entity.hbs',
      'query-dto.hbs',
      'create-dto.hbs',
      'update-dto.hbs',
      'delete-dto.hbs', // 确保这个模板存在，因为控制器会引用它
      'service.hbs',
      'controller.hbs',
      'module.hbs',
    ];

    for (const templateFile of generationOrder) {

      const templateContent = await fs.readFile(
          path.join(this.templateDir, templateFile),
          'utf-8',
      );
      const template = Handlebars.compile(templateContent);
      const renderedContent = template(context);

      let outputDir = basePath;
      let outputFileName: string; // 【修复】在循环作用域的开始处声明变量
      const baseName = path.basename(templateFile, '.hbs'); // e.g., 'entity', 'service', 'create-dto'

      if (baseName.includes('-dto')) {
        outputDir = path.join(basePath, 'dto');
        outputFileName = `${baseName.replace('-dto', '')}-${moduleName}.dto.ts`;
      } else {
        // 【修复】确保核心文件（entity, service, controller, module）有正确的、唯一的文件名
        outputFileName = `${moduleName}.${baseName}.ts`;
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