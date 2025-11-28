/**
 * InkCop Exchange Client - 类型定义
 * 框架无关的 Exchange 服务客户端 SDK
 */

// ==================== 连接相关 ====================

/** 连接状态 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** 客户端配置 */
export interface ExchangeClientConfig {
  /** Exchange 服务器 URL */
  baseUrl: string;
  /** 客户端 ID（可选，不提供则自动生成） */
  clientId?: string;
  /** 自动重连（默认 true） */
  autoReconnect?: boolean;
  /** 最大重连次数（默认 5） */
  maxReconnectAttempts?: number;
  /** 重连延迟基数（毫秒，默认 3000） */
  reconnectDelay?: number;
  /** 调试模式（默认 false） */
  debug?: boolean;
}

/** 标准化后的配置（所有字段必填） */
export interface NormalizedConfig {
  baseUrl: string;
  clientId: string;
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  debug: boolean;
}

// ==================== 数据结构 ====================

/** 工具定义 */
export interface Tool {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

/** 库信息 */
export interface LibraryInfo {
  uuid: string;
  name: string;
  description?: string;
}

/** 知识库信息 */
export interface KnowledgeBaseInfo {
  id: number;
  name: string;
  description?: string;
}

/** 服务器状态 */
export interface ServerStatus {
  clientId: string;
  serverId: string;
  appOnline: boolean;
  tools: Tool[];
  libraries: LibraryInfo[];
  knowledgeBases: KnowledgeBaseInfo[];
}

// ==================== 消息相关 ====================

/** 消息类型 */
export type MessageType = 'chat' | 'tool_call' | 'system';

/** 聊天消息角色 */
export type MessageRole = 'user' | 'assistant' | 'system';

/** 聊天消息 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/** 对话历史消息（用于多轮对话） */
export interface ConversationMessage {
  role: MessageRole;
  content: string;
}

/** 发送聊天选项 */
export interface SendChatOptions {
  /** 对话 ID（可选，自动生成） */
  conversationId?: string;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 启用的工具名称列表（InkCop 主应用会根据名称提取完整工具定义） */
  tools?: string[];
  /** 完整对话历史（包括之前的消息） */
  messages?: ConversationMessage[];
}

/** 工具调用选项 */
export interface CallToolOptions {
  /** 对话 ID（可选，自动生成） */
  conversationId?: string;
}

/** 流式消息块 */
export interface StreamChunk {
  content: string;
  chunkIndex: number;
  finished: boolean;
  conversationId: string;
  /** 消息序号，用于区分不同轮次的消息 */
  messageIndex?: number;
}

/** 完成的消息 */
export interface CompletedMessage extends ChatMessage {
  conversationId: string;
  finished: boolean;
  /** 是否有后续工具调用 */
  hasToolCalls?: boolean;
  /** 消息序号 */
  messageIndex?: number;
}

/** 工具调用信息 */
export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/** 工具调用开始事件 */
export interface ToolCallStartEvent {
  conversationId: string;
  toolCalls: ToolCallInfo[];
  /** 消息序号 */
  messageIndex: number;
}

/** 单个工具执行结果 */
export interface ToolExecutionResult {
  conversationId: string;
  toolCallId: string;
  toolName: string;
  result: string;
  success: boolean;
  /** 消息序号 */
  messageIndex: number;
}

/** 工具调用结果（用于直接调用工具的响应） */
export interface ToolCallResult {
  toolName: string;
  result: unknown;
  success: boolean;
  conversationId: string;
}

// ==================== 协议消息 ====================

/** 发送到服务器的中继消息 */
export interface RelayMessage {
  type: MessageType;
  conversation_id: string;
  client_id: string[];
  message: ChatRelayPayload | ToolRelayPayload;
}

/** 聊天消息载荷 */
export interface ChatRelayPayload {
  content: string;
  role: 'user';
  system_prompt?: string;
  /** 工具名称数组，InkCop 主应用会根据名称提取完整工具定义 */
  tools?: string[];
  /** 完整对话历史 */
  messages?: ConversationMessage[];
}

/** 工具调用载荷 */
export interface ToolRelayPayload {
  tool_name: string;
  arguments: Record<string, unknown>;
}

/** 服务器响应的流式消息 */
export interface ServerStreamMessage {
  content: string;
  finished: boolean;
  chunk_index: number;
  conversation_id: string;
  client_id: string[];
  server_id: string;
}

/** 服务器响应的完整消息 */
export interface ServerCompleteMessage {
  type: MessageType;
  message: {
    content?: string;
    text?: string;
    role?: MessageRole;
    finished?: boolean;
    [key: string]: unknown;
  };
  conversation_id?: string;
  finished?: boolean;
}
