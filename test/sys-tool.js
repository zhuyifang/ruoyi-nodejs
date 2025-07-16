// test/sys-tool.js
import { $post } from './axios.js';

async function main() {
    try {
        // 1. 提供完整的登录凭证
        const loginResponse = await $post('/sys-auth/login', {
            username: 'admin', // 替换为您的用户名
            password: 'admin', // 替换为您的密码
        });

        // 2. 正确提取 access_token
        const token = loginResponse.data.data.access_token;
        console.log('成功获取 Token:', token);

        if (!token) {
            console.error('登录失败，未能获取 Token');
            return;
        }

        // 3. 使用 await 等待接口调用完成
        const generateResponse = await $post(
            '/sys-tool/generate-from-table',
            {
                tableName: 'plugin_single_page',
                pluginDir: 'single-page',
            },
            token,
        );

        console.log('代码生成接口响应:', generateResponse.data);
    } catch (error) {
        // 捕获并打印更详细的错误信息
        console.error(
            '请求失败:',
            error.response ? error.response.data : error.message,
        );
    }
}

main();