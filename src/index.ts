/**
 * InkCop Exchange Client
 * 框架无关的 Exchange 服务客户端 SDK
 *
 * @example
 * ```typescript
 * import { InkcopExchangeClient } from 'inkcop-exchange-client';
 *
 * const client = new InkcopExchangeClient({
 *   baseUrl: 'http://localhost:9200',
 *   debug: true,
 * });
 *
 * client.on('connection:connected', (status) => {
 *   console.log('Connected:', status.serverId);
 * });
 *
 * client.on('message:stream', (chunk) => {
 *   console.log('Stream:', chunk.content);
 * });
 *
 * await client.connect();
 * await client.sendChat('Hello!');
 * ```
 */

// 导出核心客户端类
export { InkcopExchangeClient } from './client';

// 导出所有类型
export type {
  // 连接相关
  ConnectionStatus,
  ExchangeClientConfig,
  NormalizedConfig,
  // 数据结构
  Tool,
  LibraryInfo,
  KnowledgeBaseInfo,
  ServerStatus,
  // 消息相关
  MessageType,
  MessageRole,
  ChatMessage,
  ConversationMessage,
  SendChatOptions,
  CallToolOptions,
  StreamChunk,
  CompletedMessage,
  ToolCallInfo,
  ToolCallStartEvent,
  ToolExecutionResult,
  ToolCallResult,
  // 协议消息
  RelayMessage,
  ChatRelayPayload,
  ToolRelayPayload,
  ServerStreamMessage,
  ServerCompleteMessage,
} from './types';

// 导出事件类型
export type {
  ExchangeClientEventMap,
  EventListener,
  EventName,
  MessageLogEntry,
  ConnectionStatusEvent,
  MessageErrorEvent,
  ToolErrorEvent,
} from './events';

// 导出常量
export { DEFAULT_CONFIG, SSE_EVENTS, API_ENDPOINTS } from './constants';
