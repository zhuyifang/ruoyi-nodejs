// src/common/interceptors/transform.interceptor.ts

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../dto/api-response.dto';

@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, ApiResponse<T>>
{
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<ApiResponse<T>> {
        return next.handle().pipe(
            map((data) => {
                // 如果控制器/处理器已经返回了 ApiResponse 格式，则直接返回，避免重复包装
                if (data instanceof ApiResponse) {
                    return data;
                }
                // 否则，使用 ApiResponse.success 进行包装
                return ApiResponse.success(data);
            }),
        );
    }
}