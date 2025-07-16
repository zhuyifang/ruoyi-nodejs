import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import {ValidationPipe} from "@nestjs/common";
import {SwaggerModule, DocumentBuilder} from '@nestjs/swagger'; // 1. 导入 Swagger 模块
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors();
    app.useGlobalInterceptors(new TransformInterceptor());
    const config = new DocumentBuilder()
        .setTitle('若依 Node.js 版 API') // 你的 API 标题
        .setDescription('这是一个基于 NestJS 实现的若依后台管理系统 API 文档') // API 描述
        .setVersion('1.0') // 版本号
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // 自动剥离 DTO 中未定义的属性
            transform: true, // 自动将传入的数据转换为 DTO 实例类型
        }),
    );
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Swagger UI available at: http://localhost:${port}/api-docs`);
}

bootstrap();
