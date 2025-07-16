// src/common/dto/api-response.dto.ts

import { HttpStatus } from '@nestjs/common';

export class ApiResponse<T> {
    /**
     * 业务状态码
     */
    readonly code: number;

    /**
     * 响应消息
     */
    readonly message: string;

    /**
     * 响应数据
     */
    readonly data: T;

    constructor(code: number, data: T, message = 'success') {
        this.code = code;
        this.data = data;
        this.message = message;
    }

    /**
     * 创建一个表示成功的静态方法
     * @param data 返回的数据
     * @param message 成功的消息
     */
    static success<T>(data: T, message = '请求成功') {
        return new ApiResponse(HttpStatus.OK, data, message);
    }
}