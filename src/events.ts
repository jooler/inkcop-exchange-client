/**
 * InkCop Exchange Client - 事件类型定义
 */

import type {
  ConnectionStatus,
  ServerStatus,
  StreamChunk,
  CompletedMessage,
  ToolCallResult,
  ToolCallStartEvent,
  ToolExecutionResult,
} from './types';

/** 消息日志条目 */
export interface MessageLogEntry {
  direction: 'send' | 'receive';
  data: unknown;
  timestamp: number;
}

/** 事件类型映射 */
export interface ExchangeClientEventMap {
  // 连接事件
  'connection:status': ConnectionStatusEvent;
  'connection:connected': ServerStatus;
  'connection:disconnected': void;
  'connection:error': Error;

  // App 状态事件
  'app:online': ServerStatus;
  'app:offline': void;
  'app:data-update': ServerStatus;

  // 消息事件
  'message:stream': StreamChunk;
  'message:complete': CompletedMessage;
  'message:error': MessageErrorEvent;

  // 工具调用事件
  'tool:start': ToolCallStartEvent;
  'tool:result': ToolExecutionResult;
  'tool:complete': ToolCallResult;
  'tool:error': ToolErrorEvent;

  // 原始消息事件（用于调试）
  'raw:send': MessageLogEntry;
  'raw:receive': MessageLogEntry;
}

/** 连接状态事件 */
export interface ConnectionStatusEvent {
  status: ConnectionStatus;
  error?: string;
}

/** 消息错误事件 */
export interface MessageErrorEvent {
  message: string;
  conversationId: string;
}

/** 工具错误事件 */
export interface ToolErrorEvent {
  toolName: string;
  message: string;
  conversationId: string;
}

/** 事件监听器类型 */
export type EventListener<T> = (data: T) => void;

/** 事件名称类型 */
export type EventName = keyof ExchangeClientEventMap;
