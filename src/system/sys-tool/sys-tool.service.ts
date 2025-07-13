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
import { DataSource } from 'typeorm';
import * as path from 'node:path';
import * as fs from 'fs/promises';
import * as Handlebars from 'handlebars';
import { capitalCase, camelCase, pascalCase } from 'change-case';
import { GenerateFromTableDto } from './dto/generate-from-table.dto';
import { GenerateCodeDto, FieldDto } from './dto/generate-code.dto';
import { SysMenuService } from '@/system/sys-menu/sys-menu.service';
import { CreateMenuDto } from '@/system/sys-menu/dto/create-menu.dto';

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
        throw new BadRequestException(
          "对于非系统表，必须提供 'pluginDir' 字段。",
        );
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
    dbType = dbType.toLowerCase();
    if (['varchar', 'text', 'char', 'string'].some((t) => dbType.includes(t))) {
      return 'string';
    }
    if (
      ['int', 'integer', 'decimal', 'double', 'float', 'real', 'numeric'].some(
        (t) => dbType.includes(t),
      )
    ) {
      return 'number';
    }
    if (['boolean', 'tinyint(1)', 'bit'].some((t) => dbType.includes(t))) {
      return 'boolean';
    }
    if (['datetime', 'timestamp', 'date'].some((t) => dbType.includes(t))) {
      return 'Date';
    }
    return 'string';
  }

  private pascalToTitleCase(str: string): string {
    const spaced = capitalCase(str);
    return spaced.replace(/^Sys /, '');
  }

  private async addModuleToMenu(moduleName: string, entityName: string) {
      const menuName = `${this.pascalToTitleCase(entityName)}管理`;
      const menuData: CreateMenuDto = {
        parentId: 0,
        menuName: menuName,
        menuType: 'M',
        orderNum: 0,
        path: moduleName,
        status: true,
        visible: true,
        component: 'Layout',
      };
      await this.sysMenuService.create(menuData);
      this.logger.log(`成功为模块 [${moduleName}] 创建顶级菜单: ${menuName}`);
  }

  // 【关键修复】修正此方法的类型签名
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
    // 现在 context 对象包含了所有需要的数据，包括 modulePrefix
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

    const dtoPath = path.join(basePath, 'dto');

    await fs.mkdir(dtoPath);

    const filesToGenerate = [
      {
        template: 'module.hbs',
        output: path.join(basePath, `${moduleName}.module.ts`),
      },
      {
        template: 'controller.hbs',
        output: path.join(basePath, `${moduleName}.controller.ts`),
      },
      {
        template: 'service.hbs',
        output: path.join(basePath, `${moduleName}.service.ts`),
      },
      {
        template: 'entity.hbs',
        output: path.join(basePath, `${moduleName}.entity.ts`),
      },
      {
        template: 'create-dto.hbs',
        output: path.join(dtoPath, `create-${moduleName}.dto.ts`),
      },
      {
        template: 'query-dto.hbs',
        output: path.join(dtoPath, `query-${moduleName}.dto.ts`),
      },
      {
        template: 'update-dto.hbs',
        output: path.join(dtoPath, `update-${moduleName}.dto.ts`),
      },
      {
        template: 'delete-dto.hbs',
        output: path.join(dtoPath, `delete-${moduleName}.dto.ts`),
      },
    ];

    for (const file of filesToGenerate) {
      const templateContent = await fs.readFile(
        path.join(this.templateDir, file.template),
        'utf-8',
      );
      const template = Handlebars.compile(templateContent);
      const renderedContent = template(context);
      await fs.writeFile(file.output, renderedContent);
      this.logger.log(`成功生成文件: ${file.output}`);
    }

    if (moduleType === 'application') {
      await this.addModuleToMenu(moduleName, entityName);
    }

    return {
      message: `模块 ${moduleName} 已在 '${basePath}' 目录下成功生成！`,
    };
  }
}
