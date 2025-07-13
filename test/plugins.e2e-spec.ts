// test/plugins.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { discoverAndGenerateConfigs } from './run-crud-tests';
// 【关键】导入 SysUserService 以便创建测试用户
import { SysUserService } from '../src/system/sys-user/sys-user.service';
import { CreateUserDto } from '../src/system/sys-user/dto/create-user.dto';

jest.setTimeout(60000);

describe('Plugin E2E Tests (Automated)', () => {
    let app: INestApplication;
    let token: string;

    // 在所有测试开始前，初始化 Nest 应用、创建用户并登录
    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // --- 【修复一：数据填充】 ---
        // 在测试开始前，确保 admin 用户存在于测试数据库中
        const userService = moduleFixture.get<SysUserService>(SysUserService);
        const adminUserExists = await userService.findOneByUsername('admin');
        if (!adminUserExists) {
            const adminDto: CreateUserDto = {
                username: 'admin',
                password: 'admin', // service 会自动加密
                email: 'admin@test.com',
                // 根据您的 DTO 添加其他必填字段
            };
            await userService.create(adminDto);
            console.log('\n[Test Setup] "admin" user created for E2E test.');
        }

        // --- 【修复二 & 修复三：修正登录逻辑】 ---
        const loginResponse = await request(app.getHttpServer())
            .post('/sys-auth/login')
            .send({ username: 'admin', password: 'admin' })
            // 1. 登录成功状态码应为 200 (OK)
            .expect(200);

        // 2. 根据 AuthService 的返回，token 直接在 body 下，没有 data 包装层
        token = loginResponse.body.access_token;
        expect(token).toBeDefined();
    });

    // 在所有测试结束后，关闭应用
    afterAll(async () => {
        await app.close();
    });

    // ... 您的动态 CRUD 测试用例保持不变 ...
    it('should discover plugins and run CRUD tests for each one sequentially', async () => {
        // 1. 在测试用例内部，首先异步获取所有配置
        const allConfigs = await discoverAndGenerateConfigs();

        // 2. (可选但推荐) 做一个断言，确保我们确实找到了配置，避免测试静默失败
        expect(allConfigs.length).toBeGreaterThan(0);

        // 3. 使用 for...of 循环来按顺序执行每个插件的测试，确保测试之间不互相干扰
        for (const config of allConfigs) {
            console.log(`\n--- [BEGIN] Testing Plugin: ${config.moduleName} ---`);
            let createdEntityId: number;

            // 4. 在循环内部，使用 await 来确保每个 HTTP 请求都按顺序完成
            // CREATE
            const createResponse = await request(app.getHttpServer())
                .post(config.baseUrl)
                .set('Authorization', `Bearer ${token}`)
                .send(config.createData)
                .expect(200);

            expect(createResponse.body.id).toBeDefined();
            createdEntityId = createResponse.body.id;
            console.log(`  ✅ CREATE successful, ID: ${createdEntityId}`);

            // FIND ONE
            const findOneResponse = await request(app.getHttpServer())
                .get(`${config.baseUrl}/${createdEntityId}`)
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(findOneResponse.body[config.uniqueField]).toEqual(config.createData[config.uniqueField]);
            console.log(`  ✅ FIND ONE successful`);

            // UPDATE
            const updateResponse = await request(app.getHttpServer())
                .patch(`${config.baseUrl}/${createdEntityId}`)
                .set('Authorization', `Bearer ${token}`)
                .send(config.updateData)
                .expect(200);

            expect(updateResponse.body[config.uniqueField]).toEqual(config.updateData[config.uniqueField]);
            console.log(`  ✅ UPDATE successful`);

            // DELETE
            await request(app.getHttpServer())
                .delete(`${config.baseUrl}/${createdEntityId}`)
                .set('Authorization', `Bearer ${token}`)
                .expect(204);
            console.log(`  ✅ DELETE successful`);

            console.log(`--- [END] Testing Plugin: ${config.moduleName} ---\n`);
        }
    });
});