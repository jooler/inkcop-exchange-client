/**
 * InkCop Exchange Client - 类型定义
 * 框架无关的 Exchange 服务客户端 SDK
 */
/** 连接状态 */
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
/** 客户端配置 */
interface ExchangeClientConfig {
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
interface NormalizedConfig {
    baseUrl: string;
    clientId: string;
    autoReconnect: boolean;
    maxReconnectAttempts: number;
    reconnectDelay: number;
    debug: boolean;
}
/** 工具定义 */
interface Tool {
    name: string;
    description: string;
    parameters?: Record<string, unknown>;
}
/** 库信息 */
interface LibraryInfo {
    uuid: string;
    name: string;
    description?: string;
}
/** 知识库信息 */
interface KnowledgeBaseInfo {
    id: number;
    name: string;
    description?: string;
}
/** 服务器状态 */
interface ServerStatus {
    clientId: string;
    serverId: string;
    appOnline: boolean;
    tools: Tool[];
    libraries: LibraryInfo[];
    knowledgeBases: KnowledgeBaseInfo[];
}
/** 消息类型 */
type MessageType = 'chat' | 'tool_call' | 'system';
/** 聊天消息角色 */
type MessageRole = 'user' | 'assistant' | 'system';
/** 聊天消息 */
interface ChatMessage {
    role: MessageRole;
    content: string;
}
/** 对话历史消息（用于多轮对话） */
interface ConversationMessage {
    role: MessageRole;
    content: string;
}
/** 发送聊天选项 */
interface SendChatOptions {
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
interface CallToolOptions {
    /** 对话 ID（可选，自动生成） */
    conversationId?: string;
}
/** 流式消息块 */
interface StreamChunk {
    content: string;
    chunkIndex: number;
    finished: boolean;
    conversationId: string;
    /** 消息序号，用于区分不同轮次的消息 */
    messageIndex?: number;
}
/** 完成的消息 */
interface CompletedMessage extends ChatMessage {
    conversationId: string;
    finished: boolean;
    /** 是否有后续工具调用 */
    hasToolCalls?: boolean;
    /** 消息序号 */
    messageIndex?: number;
}
/** 工具调用信息 */
interface ToolCallInfo {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}
/** 工具调用开始事件 */
interface ToolCallStartEvent {
    conversationId: string;
    toolCalls: ToolCallInfo[];
    /** 消息序号 */
    messageIndex: number;
}
/** 单个工具执行结果 */
interface ToolExecutionResult {
    conversationId: string;
    toolCallId: string;
    toolName: string;
    result: string;
    success: boolean;
    /** 消息序号 */
    messageIndex: number;
}
/** 工具调用结果（用于直接调用工具的响应） */
interface ToolCallResult {
    toolName: string;
    result: unknown;
    success: boolean;
    conversationId: string;
}
/** 发送到服务器的中继消息 */
interface RelayMessage {
    type: MessageType;
    conversation_id: string;
    client_id: string[];
    message: ChatRelayPayload | ToolRelayPayload;
}
/** 聊天消息载荷 */
interface ChatRelayPayload {
    content: string;
    role: 'user';
    system_prompt?: string;
    /** 工具名称数组，InkCop 主应用会根据名称提取完整工具定义 */
    tools?: string[];
    /** 完整对话历史 */
    messages?: ConversationMessage[];
}
/** 工具调用载荷 */
interface ToolRelayPayload {
    tool_name: string;
    arguments: Record<string, unknown>;
}
/** 服务器响应的流式消息 */
interface ServerStreamMessage {
    content: string;
    finished: boolean;
    chunk_index: number;
    conversation_id: string;
    client_id: string[];
    server_id: string;
}
/** 服务器响应的完整消息 */
interface ServerCompleteMessage {
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

/**
 * InkCop Exchange Client - 事件类型定义
 */

/** 消息日志条目 */
interface MessageLogEntry {
    direction: 'send' | 'receive';
    data: unknown;
    timestamp: number;
}
/** 事件类型映射 */
interface ExchangeClientEventMap {
    'connection:status': ConnectionStatusEvent;
    'connection:connected': ServerStatus;
    'connection:disconnected': void;
    'connection:error': Error;
    'app:online': ServerStatus;
    'app:offline': void;
    'app:data-update': ServerStatus;
    'message:stream': StreamChunk;
    'message:complete': CompletedMessage;
    'message:error': MessageErrorEvent;
    'tool:start': ToolCallStartEvent;
    'tool:result': ToolExecutionResult;
    'tool:complete': ToolCallResult;
    'tool:error': ToolErrorEvent;
    'raw:send': MessageLogEntry;
    'raw:receive': MessageLogEntry;
}
/** 连接状态事件 */
interface ConnectionStatusEvent {
    status: ConnectionStatus;
    error?: string;
}
/** 消息错误事件 */
interface MessageErrorEvent {
    message: string;
    conversationId: string;
}
/** 工具错误事件 */
interface ToolErrorEvent {
    toolName: string;
    message: string;
    conversationId: string;
}
/** 事件监听器类型 */
type EventListener<T> = (data: T) => void;
/** 事件名称类型 */
type EventName = keyof ExchangeClientEventMap;

/**
 * InkCop Exchange Client - 核心客户端类
 * 框架无关的 Exchange 服务客户端
 */

/**
 * InkCop Exchange 客户端
 * 用于与 Exchange 服务器建立 SSE 连接并进行消息交互
 */
declare class InkcopExchangeClient {
    private config;
    private eventSource;
    private status;
    private serverStatus;
    private reconnectAttempts;
    private reconnectTimer;
    private listeners;
    private messageLogs;
    private maxLogEntries;
    constructor(config: ExchangeClientConfig);
    /**
     * 连接到 Exchange 服务器
     */
    connect(): Promise<boolean>;
    /**
     * 断开连接
     */
    disconnect(): void;
    /**
     * 发送聊天消息
     * @param content 当前用户消息内容
     * @param options 选项，包括对话历史、系统提示词、工具等
     */
    sendChat(content: string, options?: SendChatOptions): Promise<string>;
    /**
     * 调用工具
     */
    callTool(toolName: string, args: Record<string, unknown>, options?: CallToolOptions): Promise<string>;
    getStatus(): ConnectionStatus;
    getServerStatus(): ServerStatus | null;
    isConnected(): boolean;
    isAppOnline(): boolean;
    getTools(): Tool[];
    getLibraries(): LibraryInfo[];
    getKnowledgeBases(): KnowledgeBaseInfo[];
    getClientId(): string;
    getMessageLogs(): MessageLogEntry[];
    clearMessageLogs(): void;
    on<K extends EventName>(event: K, listener: EventListener<ExchangeClientEventMap[K]>): this;
    off<K extends EventName>(event: K, listener: EventListener<ExchangeClientEventMap[K]>): this;
    once<K extends EventName>(event: K, listener: EventListener<ExchangeClientEventMap[K]>): this;
    private emit;
    /**
     * 销毁实例，清理所有资源
     */
    destroy(): void;
    private normalizeConfig;
    private setStatus;
    private log;
    private addLog;
    private setupEventSourceHandlers;
    private handleConnectedEvent;
    private handleAppOnlineEvent;
    private handleAppOfflineEvent;
    private handleDataUpdateEvent;
    private handleMessageEvent;
    private scheduleReconnect;
    private clearReconnectTimer;
    private postRelay;
    /**
     * 从服务器获取工具列表
     */
    fetchTools(): Promise<Tool[]>;
}

/**
 * InkCop Exchange Client - 常量定义
 */
/** 默认配置 */
declare const DEFAULT_CONFIG: {
    readonly autoReconnect: true;
    readonly maxReconnectAttempts: 5;
    readonly reconnectDelay: 3000;
    readonly debug: false;
};
/** SSE 事件名称 */
declare const SSE_EVENTS: {
    readonly CONNECTED: "connected";
    readonly APP_ONLINE: "app_online";
    readonly APP_OFFLINE: "app_offline";
    readonly DATA_UPDATE: "data_update";
    readonly MESSAGE: "message";
};
/** API 端点 */
declare const API_ENDPOINTS: {
    readonly EVENTS: "/events";
    readonly RELAY: "/relay";
    readonly GET_TOOLS: "/get_tools";
};

export { API_ENDPOINTS, type CallToolOptions, type ChatMessage, type ChatRelayPayload, type CompletedMessage, type ConnectionStatus, type ConnectionStatusEvent, type ConversationMessage, DEFAULT_CONFIG, type EventListener, type EventName, type ExchangeClientConfig, type ExchangeClientEventMap, InkcopExchangeClient, type KnowledgeBaseInfo, type LibraryInfo, type MessageErrorEvent, type MessageLogEntry, type MessageRole, type MessageType, type NormalizedConfig, type RelayMessage, SSE_EVENTS, type SendChatOptions, type ServerCompleteMessage, type ServerStatus, type ServerStreamMessage, type StreamChunk, type Tool, type ToolCallInfo, type ToolCallResult, type ToolCallStartEvent, type ToolErrorEvent, type ToolExecutionResult, type ToolRelayPayload };
