// src/common/interceptors/success-response.interceptor.ts
import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';

@Injectable()
export class SuccessResponseInterceptor implements NestInterceptor {
    constructor(private readonly reflector: Reflector) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        // 检查开发者是否已经用 @HttpCode() 显式设置了状态码
        const customCode = this.reflector.get<number>(
            HTTP_CODE_METADATA,
            context.getHandler(),
        );

        // 如果已经设置了，则尊重开发者的设置，直接返回
        if (customCode) {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse();

        return next.handle().pipe(
            tap(() => {
                // 【规则一】对于 POST 请求，将默认的 201 改为 200
                if (request.method === 'POST' && response.statusCode === HttpStatus.CREATED) {
                    response.statusCode = HttpStatus.OK;
                }

                // 【规则二 - 新增】对于 DELETE 请求，将默认的 204 改为 200
                if (request.method === 'DELETE' && response.statusCode === HttpStatus.NO_CONTENT) {
                    response.statusCode = HttpStatus.OK;
                }
            }),
        );
    }
}