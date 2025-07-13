// test/run-crud-tests.ts
// 现在它是一个标准的 TypeScript 辅助文件

import * as fs from 'fs/promises';
import * as path from 'path';
import { pascalCase } from 'change-case';

// 在由 ts-jest 编译的 TS 文件中，__dirname 是可用的
const PROJECT_ROOT = path.join(__dirname, '..'); // 项目根目录是 test 目录的上一级
const PLUGINS_DIR = path.join(PROJECT_ROOT, 'src', 'plugins');

// 【推荐】定义一个接口来描述配置对象的结构，以获得类型安全
interface CrudTestConfig {
    moduleName: string;
    baseUrl: string;
    // 【优化】使用更精确的类型，而不是宽泛的 object
    createData: Record<string, any>;
    updateData: Record<string, any>;
    uniqueField: string;
}

// ... (generateFakeData 函数保持不变) ...
function generateFakeData(type: string, fieldName: string): string | number | boolean | Date | null {
    const timestamp = Date.now().toString().slice(-6);
    switch (type) {
        case 'string':
            return `测试${fieldName}-${timestamp}`;
        case 'number':
            return Math.floor(Math.random() * 1000);
        case 'boolean':
            return true;
        case 'Date':
            return new Date();
        default:
            return null;
    }
}

// 【优化】为返回值定义一个更清晰的类型别名
type GeneratedData = {
    createData: Record<string, any>;
    updateData: Record<string, any>;
    uniqueField: string;
} | null;

function parseDtoAndGenerateData(dtoContent: string): GeneratedData {
    // 【修复】为动态对象提供索引签名类型，以解决 'never' 类型错误
    const createData: Record<string, any> = {};
    let uniqueField: string | null = null;

    const fieldRegex = /(?:@\w+\(?[^)]*\)?\s*)*\s*(\w+)\??:\s*(\w+);/g;
    let match;

    while ((match = fieldRegex.exec(dtoContent)) !== null) {
        const allDecorators = match[0];
        const fieldName = match[1];
        const fieldType = match[2];

        if (allDecorators.includes('@IsOptional()')) {
            continue;
        }

        if (allDecorators.includes('@IsNotEmpty')) {
            createData[fieldName] = generateFakeData(fieldType, fieldName);
            if (!uniqueField && fieldType === 'string') {
                uniqueField = fieldName;
            }
        }
    }

    if (!uniqueField) {
        console.warn('无法自动确定唯一字段 (uniqueField)，测试可能不准确。');
        return null;
    }

    // 【修复】为动态对象提供索引签名类型
    const updateData: Record<string, any> = {};
    updateData[uniqueField] = `【已更新】${generateFakeData('string', uniqueField)}`;
    const otherField = Object.keys(createData).find(k => k !== uniqueField);
    if (otherField) {
        const otherFieldType = typeof createData[otherField] === 'number' ? 'number' : 'string';
        updateData[otherField] = generateFakeData(otherFieldType, otherField);
    }

    return { createData, updateData, uniqueField };
}


// 【关键】只导出核心的发现和生成函数
// 【推荐】为函数添加明确的返回类型
export async function discoverAndGenerateConfigs(): Promise<CrudTestConfig[]> {
    console.log(`\n[Jest-E2E] 正在扫描插件目录进行智能分析: ${PLUGINS_DIR}`);
    // 为数组提供明确的类型，避免被推断为 never[]
    const configs: CrudTestConfig[] = [];
    const pluginDirs = await fs.readdir(PLUGINS_DIR, { withFileTypes: true });

    for (const dirent of pluginDirs) {
        if (dirent.isDirectory() && !dirent.name.startsWith('_')) {
            const pluginName = dirent.name;
            const dtoPath = path.join(PLUGINS_DIR, pluginName, 'dto', `create-${pluginName}.dto.ts`);
            try {
                const dtoContent = await fs.readFile(dtoPath, 'utf-8');
                const generatedConfig = parseDtoAndGenerateData(dtoContent);
                if (generatedConfig) {
                    configs.push({
                        moduleName: pascalCase(pluginName),
                        baseUrl: `/plugins/${pluginName}`,
                        ...generatedConfig,
                    });
                    console.log(`  - ✅ 成功为 [${pluginName}] 自动生成测试配置。`);
                }
            } catch {
                // 忽略错误，继续处理下一个插件
            }
        }
    }
    return configs;
}