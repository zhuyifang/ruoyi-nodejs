import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {ValidationPipe} from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // 自动剥离 DTO 中未定义的属性
        transform: true, // 自动将传入的数据转换为 DTO 实例类型
      }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
