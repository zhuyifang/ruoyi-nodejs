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
import { ConfigService } from '@nestjs/config';
import { DataSource, IsNull } from 'typeorm';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as Handlebars from 'handlebars';
import { capitalCase, camelCase, pascalCase } from 'change-case';
import { GenerateFromTableDto } from './dto/generate-from-table.dto';
import { GenerateCodeDto, FieldDto } from './dto/generate-code.dto';
import { SysMenuService } from '@/system/sys-menu/sys-menu.service';
import { CreateMenuDto } from '@/system/sys-menu/dto/create-menu.dto';
import { SysMenu } from '@/system/sys-menu/sys-menu.entity';
import { QueryGenTableDto } from './dto/query-gen-table.dto';


@Injectable()
export class SysToolService implements OnModuleInit {
  private readonly logger = new Logger(SysToolService.name);
  private readonly templateDir = path.join(
      process.cwd(),
      'src',
      'system',
      'sys-tool',
      'sys-template',
  );

  constructor(
      @InjectDataSource() private readonly dataSource: DataSource,
      private readonly sysMenuService: SysMenuService,
      private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    // 【修复】将助记符 'eq' 重命名为 'isEq'，以匹配模板中的用法
    Handlebars.registerHelper('not', function (value) {
      return !value;
    });
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

      return new Handlebars.SafeString(
          `{\n        ${options.join(',\n        ')}\n    }`,
      );
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
              decorators.push(
                  `@IsNotEmpty({ message: '${column.comment} 不能为空' })`,
              );
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
    // 【架构升级】添加 'and' 辅助函数，以支持模板中更复杂的条件逻辑
    Handlebars.registerHelper('and', function (...args) {
      const _options = args.pop();
      return args.every(Boolean);
    });
    Handlebars.registerHelper('camelCase', (str) => camelCase(str));
    // 【修复】注册缺失的 pascalToTitleCase 辅助函数，以解决模板渲染错误
    Handlebars.registerHelper('pascalToTitleCase', (str) =>
        this.pascalToTitleCase(str),
    );
    // 【终极修复】注册一个专门的 `vue` 辅助函数，以编程方式生成 Vue 插值语法。
    // 这可以从根本上解决 Handlebars 与 Vue 语法冲突导致的所有渲染问题。
    Handlebars.registerHelper('vue', (text) => {
      return new Handlebars.SafeString(`{{ ${text} }}`);
    });
    await this.registerPartials();
  }

  private async registerPartials() {
    try {
      // 【修复】由于 templateDir 已更改为父目录，因此现在需要为 partial 指定其子目录。
      const partialPath = path.join(
          this.templateDir,
          'crud',
          '_common-fields.hbs',
      );
      const partialContent = await fs.promises.readFile(partialPath, 'utf-8');
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

  async listTables(queryDto: QueryGenTableDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      // 1. 获取所有 plugin_ 和 sys_ 表
      const allTables: { table_name: string; table_comment: string }[] =
          await queryRunner.query(
              // 【核心升级】同时查询 plugin_ 和 sys_ 表
              "SELECT table_name AS table_name, table_comment AS table_comment FROM information_schema.tables WHERE table_schema = DATABASE() AND (table_name LIKE 'plugin_%' OR table_name LIKE 'sys_%')",
          );

      // 【安全加固】定义一个核心系统表的“黑名单”，防止它们被意外覆盖
      const excludedSystemTables = new Set([
        'sys_user',
        'sys_role',
        'sys_menu',
        'sys_dept',
        'sys_post',
        'sys_user_role',
      ]);

      const filteredTables = allTables.filter(
          (t) => !excludedSystemTables.has(t.table_name),
      );

      // 2. 【核心重构】组合数据，并直接通过文件系统检查生成状态
      let combinedData = filteredTables.map((table) => {
        const isSystem = table.table_name.startsWith('sys_');
        const moduleName = table.table_name
            .replace(/^(sys|plugin)_/, '')
            .replace(/_/g, '-');

        const moduleBasePath = isSystem ? 'system' : 'plugins';
        const moduleFullPath = path.join(
            process.cwd(),
            'src',
            moduleBasePath,
            moduleName,
            `${moduleName}.module.ts`,
        );

        try {
          // 检查关键文件 (module.ts) 是否存在
          const stats = fs.statSync(moduleFullPath);
          return {
            tableName: table.table_name,
            tableComment: table.table_comment,
            isGenerated: true,
            lastGeneratedAt: stats.mtime, // 使用文件的最后修改时间作为生成时间
          };
        } catch (error) {
          // 如果文件不存在 (fs.statSync 抛出错误)，则认为未生成
          return {
            tableName: table.table_name,
            tableComment: table.table_comment,
            isGenerated: false,
            lastGeneratedAt: null,
          };
        }
      });

      // 4. 【核心升级】在内存中执行筛选
      const { tableName, tableComment, isGenerated } = queryDto;
      if (tableName) {
        combinedData = combinedData.filter((item) =>
            item.tableName.includes(tableName),
        );
      }
      if (tableComment) {
        combinedData = combinedData.filter((item) =>
            item.tableComment.includes(tableComment),
        );
      }
      if (isGenerated) {
        const generatedBool = isGenerated === 'true';
        combinedData = combinedData.filter(
            (item) => item.isGenerated === generatedBool,
        );
      }

      // 5. 对筛选后的结果进行分页
      const total = combinedData.length;
      const { page = 1, pageSize = 10 } = queryDto;
      const offset = (page - 1) * pageSize;
      const list = combinedData.slice(offset, offset + pageSize);
      return { list, total };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 【新增】删除已生成的模块代码和相关配置
   * @param tableName 要删除模块的数据库表名
   */
  async deleteGeneratedCode(tableName: string) {
    this.logger.log(`开始删除由表 [${tableName}] 生成的模块...`);

    const isSystemTable = tableName.startsWith('sys_');
    const isPluginTable = tableName.startsWith('plugin_');

    if (!isSystemTable && !isPluginTable) {
      throw new BadRequestException('只能删除由 "plugin_" 或 "sys_" 表生成的模块。');
    }

    // 【核心升级】根据模块类型确定 moduleName 和基础路径
    let moduleName: string;
    let backendBasePath: string;
    let webBasePath: string;

    if (isSystemTable) {
      moduleName = tableName.replace(/^sys_/, '').replace(/_/g, '-');
      backendBasePath = path.join(process.cwd(), 'src', 'system');
      webBasePath = path.join(
          this.configService.get<string>('CODE_GENERATOR_WEB_PATH')!,
          'src',
          'pages',
          'system',
      );
    } else {
      // isPluginTable
      moduleName = tableName.replace(/^plugin_/, '').replace(/_/g, '-');
      backendBasePath = path.join(process.cwd(), 'src', 'plugins');
      webBasePath = path.join(
          this.configService.get<string>('CODE_GENERATOR_WEB_PATH')!,
          'src',
          'pages',
          'plugins',
      );
    }
    const moduleBackendPath = path.join(backendBasePath, moduleName);
    const moduleWebPath = path.join(webBasePath, moduleName);

    try {
      // 1. 删除后端文件
      if (fs.existsSync(moduleBackendPath)) {
        await fs.promises.rm(moduleBackendPath, {
          recursive: true,
          force: true,
        });
        this.logger.log(`成功删除后端目录: ${moduleBackendPath}`);
      } else {
        this.logger.warn(`后端目录未找到，跳过删除: ${moduleBackendPath}`);
      }

      // 2. 删除前端文件
      if (fs.existsSync(moduleWebPath)) {
        await fs.promises.rm(moduleWebPath, { recursive: true, force: true });
        this.logger.log(`成功删除前端目录: ${moduleWebPath}`);
      } else {
        this.logger.warn(`前端目录未找到，跳过删除: ${moduleWebPath}`);
      }

      // 3. 删除关联的菜单项
      const menuRepository = this.dataSource.getRepository(SysMenu);
      // 【修复】系统模块的菜单是手动维护的，而插件模块是自动生成的。删除时只处理自动生成的插件菜单。
      if (isPluginTable) {
        const perms = `app:${moduleName}:list`;
        const menuToDelete = await menuRepository.findOneBy({ perms });
        if (menuToDelete) {
          await menuRepository.remove(menuToDelete);
          this.logger.log(`成功删除与权限 [${perms}] 关联的菜单项。`);
        } else {
          this.logger.warn(`未找到与权限 [${perms}] 关联的菜单项，跳过删除。`);
        }
      }

      return { message: `模块 ${moduleName} 已被成功删除。` };
    } catch (error) {
      this.logger.error(`删除模块 ${moduleName} 时发生错误:`, error.stack);
      throw new InternalServerErrorException('删除模块失败，请查看服务器日志。');
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
          `[代码生成器调试] 发现表 '${
              dto.tableName
          }'，其结构为: ${JSON.stringify(table, null, 2)}`,
      );
      const tableComment = table.comment || '';
      
      const isSystemTable = dto.tableName.startsWith('sys_');
      if (!isSystemTable && !dto.pluginDir) {
        throw new BadRequestException(
            "对于非系统表，必须提供 'pluginDir' 字段。",
        );
      }

      let moduleName: string; // e.g., user, single-page
      let entityName: string; // e.g., User, SinglePage
      let modulePrefix: string; // Controller, Service, Module 等类的名称, e.g., SysUser, PluginSinglePage

      if (isSystemTable) {
        moduleName = dto.tableName.replace(/^sys_/, '').replace(/_/g, '-');
        entityName = pascalCase(dto.tableName); // e.g., sys_user -> SysUser (for entity class name, should be `SysUser`)
        // 对于系统模块，类名前缀与实体名相同，例如 SysUser
        modulePrefix = entityName;
      } else {
        moduleName = dto.pluginDir!;
        // 【优化】对于应用模块，从表名中移除 'plugin_' 前缀，使实体名更简洁
        entityName = pascalCase(dto.tableName.replace(/^plugin_/, '')); // e.g., plugin_single_page -> SinglePage
        // 对于插件模块，为类名添加 'Plugin' 前缀
        modulePrefix = `Plugin${pascalCase(moduleName)}`;
      }

      // 【核心重构】从“假设”变为“发现”：动态查找主键
      const primaryColumnMeta = table.columns.find((c) => c.isPrimary);
      if (!primaryColumnMeta) {
        throw new BadRequestException(
            `数据表 '${dto.tableName}' 没有主键，无法生成 CRUD 代码。`,
        );
      }
      // 如果未来要支持复合主键，可以在这里进行扩展
      const primaryKeyName = camelCase(primaryColumnMeta.name);
      const { propertyType: primaryKeyType } =
          this.mapDbColumnToTypeInfo(primaryColumnMeta);
      // 【核心重构】为前端的 useCrud 修复 id 类型推断问题
      const initialFormIdType =
          primaryKeyType === 'number' ? 'number | null' : 'string | null';

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
          // 【修复】从 TypeORM 的元数据中提取 isGenerated 和 default 值
          isAutoIncrement: column.isGenerated, // isGenerated 通常表示自增
          defaultValue: column.default !== undefined ? column.default : null,
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

      const moduleType = isSystemTable ? 'system' : 'plugin';
      const apiPrefix =
          moduleType === 'system'
              ? `/sys-${moduleName}`
              : `/plugins/${moduleName}`;

      // --- 【前端生成逻辑】 ---
      // 在内存中一次性地、智能地推断出所有前端配置

      const ignoredFieldsForForms = new Set([
        'id',
        'createdAt',
        'updatedAt',
        'createdBy',
        'updatedBy',
      ]);

      // 1. 智能推断 searchFields (通常是字符串类型且非密码的字段)
      const searchFields = columns
          .filter(
              (c) =>
                  !ignoredFieldsForForms.has(c.columnName) &&
                  c.columnName !== 'password' &&
                  c.propertyType === 'string',
          );
      // 手动将 status 字段加回来，如果存在的话
      if (columns.some((c) => c.columnName === 'status')) {
        const statusColumn = columns.find((c) => c.columnName === 'status');
        if (statusColumn) {
          searchFields.push(statusColumn);
        }
      }

      // 2. 智能推断 formFields (所有非ID字段，并对特殊字段进行处理)
      const formFields = columns
          .filter((c) => c.columnName !== 'id')
          .map((c) => {
            // 【优化】将特殊字段处理逻辑放在前面
            if (c.dataType === 'longtext' || c.dataType === 'text') {
              // 在主表单中，渲染为富文本编辑器
              return `{ name: '${c.columnName}', component: 'RichTextEditor' }`;
            }
            if (['createdAt', 'updatedAt', 'createdBy', 'updatedBy'].includes(
                    c.columnName,
                )
            ) {
              return `{ name: '${c.columnName}', showOn: 'edit', propsOnEdit: { disable: true } }`;
            }
            if (c.columnName === 'password') {
              return `{ name: 'password', hideOn: 'edit' }`;
            }
            if (c.columnName === 'username') {
              // 假设 username 唯一且不可修改
              return `{ name: 'username', propsOnEdit: { disable: true } }`;
            }
            return `'${c.columnName}'`;
          });

      // 3. 智能生成 searchForm 和 initialForm 的 JS 对象字符串
      const searchFormParts: string[] = [];
      // 【核心重构】使用动态主键生成 initialForm，并修复类型
      const initialFormParts: string[] = [
        `${primaryKeyName}: null as ${initialFormIdType}`,
      ];

      columns.forEach((c) => {
        const initialValue = c.propertyType === 'number' ? 'null' : `''`;
        if (searchFields.some((f) => f.columnName === c.columnName)) {
          searchFormParts.push(
              `${c.columnName}: ${
                  c.columnName === 'status' ? 'null as number | null' : "''"
              }`,
          );
        }
        if (!ignoredFieldsForForms.has(c.columnName)) {
          // 【优化】更智能地为新增表单设置默认值：无论 'status' 字段的原始类型是什么，都默认其值为 1 (启用)，对其他布尔类型字段也做同样处理
          const formValue =
              c.columnName === 'status' || c.propertyType === 'boolean'
                  ? 1
                  : initialValue;
          initialFormParts.push(`${c.columnName}: ${formValue}`);
        }
      });

      const templateContext = {
        moduleName,
        entityName,
        columns,
        hasTimestamps,
        hasUserStamps,
        primaryKeyName,
        primaryKeyType,
        modulePrefix,
        tableName: dto.tableName,
        tableComment,
        apiPrefix,
        moduleType, // 将模块类型加入上下文，供模板使用
        // 添加前端所需上下文
        searchFields: searchFields.map((f) => {
          // 【优化】在搜索表单中，将长文本字段渲染为普通输入框
          if (f.dataType === 'longtext' || f.dataType === 'text') {
            return `{ name: '${f.columnName}', component: 'QInput' }`;
          }
          return `'${f.columnName}'`;
        }).join(', '),
        formFields: formFields.join(',\n    '),
        searchForm: searchFormParts.join(',\n    '),
        initialForm: initialFormParts.join(',\n    '),
      };

      return this.generateFiles(
          templateContext as any,
          moduleType,
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
   * @param entityName PascalCase 格式的实体名 (e.g., 'SinglePage')
   * @param tableComment 数据库表的注释，用作菜单名
   */
  private async addModuleToMenu(
      moduleName: string,
      entityName: string,
      tableComment: string,
  ) {
    const menuRepository = this.dataSource.getRepository(SysMenu);

    // 1. 【核心修复】实现健壮的 "Find or Create" 逻辑，以防止生成重复的父级菜单
    // 由于此函数只为 'plugin' 类型调用，父级菜单固定为“系统工具”
    const parentMenuName = '系统工具';
    let parentMenu = await menuRepository.findOne({
      where: [
        { menuName: parentMenuName, parentId: IsNull() },
        { menuName: parentMenuName, parentId: 0 },
      ],
      order: { id: 'ASC' }, // 如果存在多个，优先选择 ID 最小的那个
    });

    if (!parentMenu) {
      this.logger.log(
          `父级菜单 "${parentMenuName}" 未找到，将自动创建。`,
      );
      const newParentMenu = menuRepository.create({
        menuName: parentMenuName,
        parentId: 0, // 标准化顶级菜单的 parentId 为 0
        menuType: 'M', // 'M' 代表目录
        path: '/tool', // 为“系统工具”设置一个合理的默认路径
        icon: 'construction', // 设置一个默认图标
        status: true,
        visible: true,
        orderNum: 99, // 靠后排序
      });
      parentMenu = await menuRepository.save(newParentMenu);
      this.logger.log(
          `成功创建父级菜单 [${parentMenu.menuName}]，ID: ${parentMenu.id}`,
      );
    }

    // 2. 【架构升级】构造标准的、可预测的菜单 path 和 component 路径
    // 【修复】由于此函数只为 'plugin' 类型的模块创建菜单，因此 basePath 固定为 'plugins'。
    // 这也解决了 TS2367 错误（类型 '"plugin"' 和 '"system"' 没有重叠）。
    const basePath = 'plugins';
    const menuPath = `/${basePath}/${moduleName}`;
    const componentPath = `/${basePath}/${moduleName}/index`;
    const menuName = tableComment || `${this.pascalToTitleCase(entityName)}管理`;
    
    // 3. 【核心升级】实现 "创建或更新" (Upsert) 逻辑，并获取主菜单实体
    const listPerms = `app:${moduleName}:list`;
    const menuPayload: Partial<CreateMenuDto> = {
      parentId: parentMenu.id,
      menuName,
      menuType: 'C', // C: 菜单
      orderNum: 0,
      path: menuPath, // 使用符合前端路由的完整路径
      status: true,
      visible: true,
      component: componentPath,
      perms: listPerms,
    };

    // “Upsert” 主菜单
    let mainModuleMenu = await menuRepository.findOneBy({ perms: listPerms });
    if (mainModuleMenu) {
      await menuRepository.update(mainModuleMenu.id, menuPayload);
      this.logger.log(`菜单 [${mainModuleMenu.menuName}] 已存在，执行更新...`);
    } else {
      this.logger.log(
          `在 [${parentMenu.menuName}] 下为模块 [${moduleName}] 创建新菜单...`,
      );
      // 【修复】保存后将新实体赋给变量，以获取其ID
      mainModuleMenu = await menuRepository.save(
          menuRepository.create(menuPayload as CreateMenuDto),
      );
    }

    // 4. 【核心修复】为模块自动创建增、删、改的按钮级权限
    const buttonPermissions = [
      { name: '新增', perm: `app:${moduleName}:add` },
      { name: '修改', perm: `app:${moduleName}:update` },
      { name: '删除', perm: `app:${moduleName}:delete` },
    ];

    for (const [index, btn] of buttonPermissions.entries()) {
      const btnPayload = {
        parentId: mainModuleMenu.id,
        menuName: `${menuName} / ${btn.name}`, // e.g. Single Page管理 / 新增
        menuType: 'F' as const, // F: Function/Button
        orderNum: index + 1,
        status: true,
        visible: false, // 按钮在菜单中默认不可见
        perms: btn.perm,
      };
      // "Upsert" logic for the button
      const existingBtn = await menuRepository.findOneBy({ perms: btn.perm });
      if (existingBtn) {
        await menuRepository.update(existingBtn.id, btnPayload);
      } else {
        await menuRepository.save(menuRepository.create(btnPayload));
      }
    }
    this.logger.log(`成功为模块 [${moduleName}] 同步了所有 CRUD 权限。`);
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
        tableComment?: string;
      },
      moduleType: 'system' | 'plugin',
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
    // 【架构升级】路径现在是相对于 templateDir 的，这使得组织后端（crud）和前端（web）模板成为可能。
    const generationOrder = [
      'crud/entity.hbs',
      'crud/query-dto.hbs',
      'crud/create-dto.hbs',
      'crud/update-dto.hbs',
      'crud/delete-dto.hbs',
      'crud/service.hbs',
      'crud/controller.hbs',
      'crud/module.hbs',
      // 【架构升级】添加前端模板文件
      'web/web-config.ts.hbs',
      'web/web-page.vue.hbs',
    ];

    for (const templateFile of generationOrder) {
      const templateContent = await fs.promises.readFile(
          path.join(this.templateDir, templateFile),
          'utf-8',
      );
      const template = Handlebars.compile(templateContent);
      const renderedContent = template(context);

      let outputDir = basePath;
      let outputFileName: string; // 【修复】在循环作用域的开始处声明变量
      const baseName = path.basename(templateFile, '.hbs'); // e.g., 'crud/entity.hbs' -> 'entity'

      if (baseName.includes('-dto')) {
        outputDir = path.join(basePath, 'dto');
        outputFileName = `${baseName.replace(
            '-dto',
            '',
        )}-${moduleName}.dto.ts`;
      } else if (templateFile.startsWith('web/')) {
        // 【修复】直接检查模板文件的路径，而不是解析其基本名称，这样更健壮。
        // 处理前端文件
        // 【架构升级】从配置文件中读取前端项目的路径，不再硬编码。
        const webBasePath = this.configService.get<string>(
            'CODE_GENERATOR_WEB_PATH',
        );
        if (!webBasePath) {
          throw new InternalServerErrorException(
              '前端项目路径 (CODE_GENERATOR_WEB_PATH) 未在 .env 文件中配置。',
          );
        }

        let pagesRoot: string;
        if (moduleType === 'system') {
          pagesRoot = path.join(webBasePath, 'src', 'pages', 'system');
        } else {
          pagesRoot = path.join(webBasePath, 'src', 'pages', 'plugins');
        }
        outputDir = path.join(pagesRoot, moduleName);
        if (templateFile === 'web/web-config.ts.hbs') {
          outputFileName = `${moduleName}.config.ts`;
        } else {
          outputFileName = `${entityName}Page.vue`;
        }
      } else {
        // 【修复】确保核心文件（entity, service, controller, module）有正确的、唯一的文件名
        outputFileName = `${moduleName}.${baseName}.ts`;
      }

      const outputPath = path.join(outputDir, outputFileName);

      await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.promises.writeFile(outputPath, renderedContent);
      this.logger.log(`成功生成文件: ${outputPath}`);
    }

    // 只为应用模块 (非系统模块) 创建菜单
    if (moduleType === 'plugin') {
      await this.addModuleToMenu(
          moduleName,
          entityName,
          context.tableComment || '',
      );
    }

    return {
      message: `模块 ${moduleName} 已在 '${basePath}' 目录下成功生成！`,
    };
  }
}