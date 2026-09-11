/**
 * 前台 AI 助手配置。
 * 构建时由 NEXT_PUBLIC_* 环境变量注入（.env.local / CI Secrets），
 * 静态导出会把值打进浏览器包，因此不要把密钥写进被提交的源码文件。
 */
export const AI_BASE_URL = (
  process.env.NEXT_PUBLIC_AI_BASE_URL ||
  'https://dashscope.aliyuncs.com/compatible-mode/v1'
).replace(/\/+$/, '');

export const AI_API_KEY = process.env.NEXT_PUBLIC_AI_API_KEY || '';

export const AI_MODEL =
  process.env.NEXT_PUBLIC_AI_MODEL || 'deepseek-v4-flash-0731';
