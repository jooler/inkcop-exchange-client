/**
 * InkCop Exchange Client - 常量定义
 */

/** 默认配置 */
export const DEFAULT_CONFIG = {
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 3000,
  debug: false,
} as const;

/** SSE 事件名称 */
export const SSE_EVENTS = {
  CONNECTED: 'connected',
  APP_ONLINE: 'app_online',
  APP_OFFLINE: 'app_offline',
  DATA_UPDATE: 'data_update',
  MESSAGE: 'message',
} as const;

/** API 端点 */
export const API_ENDPOINTS = {
  EVENTS: '/events',
  RELAY: '/relay',
  GET_TOOLS: '/get_tools',
} as const;

