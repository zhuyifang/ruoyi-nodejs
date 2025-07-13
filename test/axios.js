import axios from 'axios';

// 从环境变量读取端口，并提供一个默认值
const PORT = process.env.PORT || 3000;

// 创建一个 Axios 实例，用于统一配置，如 baseURL
const $http = axios.create({
  baseURL: `http://localhost:${PORT}`,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * POST 请求辅助函数
 * @param {string} url - 请求地址
 * @param {object} data - 请求体数据
 * @param {string} [token=''] - JWT Token
 * @returns {Promise} Axios Promise
 */
const $post = function (url, data, token = '') {
  return $http.post(url, data, {
    headers: { authorization: `Bearer ${token}` },
  });
};

/**
 * GET 请求辅助函数
 * @param {string} url - 请求地址
 * @param {string} [token=''] - JWT Token
 * @param {object} [params={}] - URL 查询参数
 * @returns {Promise} Axios Promise
 */
const $get = function (url, token = '', params = {}) {
  return $http.get(url, {
    headers: { authorization: `Bearer ${token}` },
    params: params,
  });
};

/**
 * PATCH 请求辅助函数
 * @param {string} url - 请求地址
 * @param {object} data - 请求体数据
 * @param {string} [token=''] - JWT Token
 * @returns {Promise} Axios Promise
 */
const $patch = function (url, data, token = '') {
  return $http.patch(url, data, {
    headers: { authorization: `Bearer ${token}` },
  });
};

/**
 * DELETE 请求辅助函数
 * 智能处理两种调用签名:
 * 1. 单个删除: $delete(url, token)
 * 2. 批量删除: $delete(url, data, token)
 * @param {string} url - 请求地址
 * @param {object|string} dataOrToken - 如果是批量删除，则为请求体数据；如果是单个删除，则为 JWT Token。
 * @param {string} [tokenIfData] - 如果是批量删除，则为 JWT Token。
 * @returns {Promise} Axios Promise
 */
const $delete = function (url, dataOrToken, tokenIfData) {
  const config = { headers: {} };

  // 签名: $delete(url, token)
  if (typeof dataOrToken === 'string' && tokenIfData === undefined) {
    config.headers.authorization = `Bearer ${dataOrToken}`;
  }
  // 签名: $delete(url, data, token)
  else if (typeof dataOrToken === 'object' && typeof tokenIfData === 'string') {
    config.headers.authorization = `Bearer ${tokenIfData}`;
    config.data = dataOrToken; // Axios 的 delete 方法需要将 body 数据放在 config.data 中
  }
  // 其他情况，例如不带 token 的删除
  else if (typeof dataOrToken === 'object') {
    config.data = dataOrToken;
  }

  return $http.delete(url, config);
};

// 导出所有辅助函数，以便在其他测试文件中使用
export { $http, $post, $get, $patch, $delete };
export default axios;
