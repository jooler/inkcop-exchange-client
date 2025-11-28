/**
 * InkCop Exchange Client - 核心客户端类
 * 框架无关的 Exchange 服务客户端
 */

import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_CONFIG, SSE_EVENTS, API_ENDPOINTS } from './constants';
import type {
  ConnectionStatus,
  ExchangeClientConfig,
  NormalizedConfig,
  ServerStatus,
  Tool,
  LibraryInfo,
  KnowledgeBaseInfo,
  SendChatOptions,
  CallToolOptions,
  StreamChunk,
  ToolCallResult,
  ToolCallStartEvent,
  ToolExecutionResult,
  RelayMessage,
  ServerStreamMessage,
  ServerCompleteMessage,
} from './types';
import type { ExchangeClientEventMap, EventListener, EventName, MessageLogEntry } from './events';

/**
 * InkCop Exchange 客户端
 * 用于与 Exchange 服务器建立 SSE 连接并进行消息交互
 */
export class InkcopExchangeClient {
  private config: NormalizedConfig;
  private eventSource: EventSource | null = null;
  private status: ConnectionStatus = 'disconnected';
  private serverStatus: ServerStatus | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // 事件监听器存储
  private listeners: Map<EventName, Set<EventListener<unknown>>> = new Map();

  // 消息日志（调试用）
  private messageLogs: MessageLogEntry[] = [];
  private maxLogEntries = 100;

  constructor(config: ExchangeClientConfig) {
    this.config = this.normalizeConfig(config);
    this.log('Client initialized', this.config);
  }

  // ==================== 公开 API ====================

  /**
   * 连接到 Exchange 服务器
   */
  async connect(): Promise<boolean> {
    if (this.status === 'connected') {
      this.log('Already connected');
      return true;
    }

    if (this.status === 'connecting') {
      this.log('Connection in progress');
      return false;
    }

    this.setStatus('connecting');

    return new Promise((resolve) => {
      try {
        const sseUrl = `${this.config.baseUrl}${API_ENDPOINTS.EVENTS}?id=${encodeURIComponent(this.config.clientId)}`;
        this.log('Connecting to', sseUrl);

        this.eventSource = new EventSource(sseUrl);
        this.setupEventSourceHandlers(resolve);
      } catch (error) {
        this.log('Connection failed', error);
        this.setStatus('error', String(error));
        resolve(false);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.log('Disconnecting...');
    this.clearReconnectTimer();

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.setStatus('disconnected');
    this.serverStatus = null;
    this.reconnectAttempts = 0;
  }

  /**
   * 发送聊天消息
   * @param content 当前用户消息内容
   * @param options 选项，包括对话历史、系统提示词、工具等
   */
  async sendChat(content: string, options: SendChatOptions = {}): Promise<string> {
    const conversationId = options.conversationId || uuidv4();

    const message: RelayMessage = {
      type: 'chat',
      conversation_id: conversationId,
      client_id: [this.config.clientId],
      message: {
        content,
        role: 'user',
        ...(options.systemPrompt && { system_prompt: options.systemPrompt }),
        ...(options.tools && options.tools.length > 0 && { tools: options.tools }),
        ...(options.messages && options.messages.length > 0 && { messages: options.messages }),
      },
    };

    await this.postRelay(message);
    return conversationId;
  }

  /**
   * 调用工具
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown>,
    options: CallToolOptions = {},
  ): Promise<string> {
    const conversationId = options.conversationId || uuidv4();

    const message: RelayMessage = {
      type: 'tool_call',
      conversation_id: conversationId,
      client_id: [this.config.clientId],
      message: {
        tool_name: toolName,
        arguments: args,
      },
    };

    await this.postRelay(message);
    return conversationId;
  }

  // ==================== 状态查询 ====================

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getServerStatus(): ServerStatus | null {
    return this.serverStatus;
  }

  isConnected(): boolean {
    return this.status === 'connected';
  }

  isAppOnline(): boolean {
    return this.serverStatus?.appOnline ?? false;
  }

  getTools(): Tool[] {
    return this.serverStatus?.tools ?? [];
  }

  getLibraries(): LibraryInfo[] {
    return this.serverStatus?.libraries ?? [];
  }

  getKnowledgeBases(): KnowledgeBaseInfo[] {
    return this.serverStatus?.knowledgeBases ?? [];
  }

  getClientId(): string {
    return this.config.clientId;
  }

  getMessageLogs(): MessageLogEntry[] {
    return [...this.messageLogs];
  }

  clearMessageLogs(): void {
    this.messageLogs = [];
  }

  // ==================== 事件系统 ====================

  on<K extends EventName>(event: K, listener: EventListener<ExchangeClientEventMap[K]>): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.add(listener as EventListener<unknown>);
    }
    return this;
  }

  off<K extends EventName>(event: K, listener: EventListener<ExchangeClientEventMap[K]>): this {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener as EventListener<unknown>);
    }
    return this;
  }

  once<K extends EventName>(event: K, listener: EventListener<ExchangeClientEventMap[K]>): this {
    const onceListener = ((data: ExchangeClientEventMap[K]) => {
      this.off(event, onceListener);
      listener(data);
    }) as EventListener<ExchangeClientEventMap[K]>;
    return this.on(event, onceListener);
  }

  private emit<K extends EventName>(event: K, data: ExchangeClientEventMap[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[ExchangeClient] Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 销毁实例，清理所有资源
   */
  destroy(): void {
    this.disconnect();
    this.listeners.clear();
    this.messageLogs = [];
    this.log('Client destroyed');
  }

  // ==================== 内部方法 ====================

  private normalizeConfig(config: ExchangeClientConfig): NormalizedConfig {
    return {
      baseUrl: config.baseUrl.replace(/\/$/, ''), // 移除末尾斜杠
      clientId: config.clientId || `client-${uuidv4().slice(0, 8)}`,
      autoReconnect: config.autoReconnect ?? DEFAULT_CONFIG.autoReconnect,
      maxReconnectAttempts: config.maxReconnectAttempts ?? DEFAULT_CONFIG.maxReconnectAttempts,
      reconnectDelay: config.reconnectDelay ?? DEFAULT_CONFIG.reconnectDelay,
      debug: config.debug ?? DEFAULT_CONFIG.debug,
    };
  }

  private setStatus(status: ConnectionStatus, error?: string): void {
    this.status = status;
    this.emit('connection:status', { status, error });

    if (status === 'disconnected') {
      this.emit('connection:disconnected', undefined as never);
    } else if (status === 'error' && error) {
      this.emit('connection:error', new Error(error));
    }
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[ExchangeClient]', ...args);
    }
  }

  private addLog(direction: 'send' | 'receive', data: unknown): void {
    const entry: MessageLogEntry = {
      direction,
      data,
      timestamp: Date.now(),
    };

    this.messageLogs.unshift(entry);

    if (this.messageLogs.length > this.maxLogEntries) {
      this.messageLogs = this.messageLogs.slice(0, this.maxLogEntries);
    }

    this.emit(direction === 'send' ? 'raw:send' : 'raw:receive', entry);
  }

  private setupEventSourceHandlers(resolveConnect: (success: boolean) => void): void {
    if (!this.eventSource) return;

    this.eventSource.onopen = () => {
      this.log('SSE connection opened');
    };

    // 监听 connected 事件
    this.eventSource.addEventListener(SSE_EVENTS.CONNECTED, (event) => {
      this.handleConnectedEvent(event);
      resolveConnect(true);
    });

    // 监听 app_online 事件
    this.eventSource.addEventListener(SSE_EVENTS.APP_ONLINE, (event) => {
      this.handleAppOnlineEvent(event);
    });

    // 监听 app_offline 事件
    this.eventSource.addEventListener(SSE_EVENTS.APP_OFFLINE, (event) => {
      this.handleAppOfflineEvent(event);
    });

    // 监听 data_update 事件
    this.eventSource.addEventListener(SSE_EVENTS.DATA_UPDATE, (event) => {
      this.handleDataUpdateEvent(event);
    });

    // 监听 message 事件
    this.eventSource.addEventListener(SSE_EVENTS.MESSAGE, (event) => {
      this.handleMessageEvent(event);
    });

    this.eventSource.onerror = () => {
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.log('SSE connection closed');
        this.setStatus('disconnected');
        this.scheduleReconnect();
      } else {
        this.log('SSE connection error, attempting recovery...');
      }
    };
  }

  private handleConnectedEvent(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data as string);
      this.addLog('receive', { event: 'connected', data });

      this.serverStatus = {
        clientId: data.clientId || this.config.clientId,
        serverId: data.serverId || '',
        appOnline: data.appOnline || false,
        tools: data.tools || [],
        libraries: data.libraries || [],
        knowledgeBases: data.knowledgeBases || [],
      };

      this.setStatus('connected');
      this.reconnectAttempts = 0;
      this.emit('connection:connected', this.serverStatus);

      this.log('Connected to server', this.serverStatus);
    } catch (error) {
      this.log('Failed to parse connected event', error);
      this.addLog('receive', event.data);
    }
  }

  private handleAppOnlineEvent(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data as string);
      this.addLog('receive', { event: 'app_online', data });

      if (this.serverStatus) {
        this.serverStatus.appOnline = true;
        if (data.tools) this.serverStatus.tools = data.tools;
        if (data.libraries) this.serverStatus.libraries = data.libraries;
        if (data.knowledgeBases) this.serverStatus.knowledgeBases = data.knowledgeBases;
        this.emit('app:online', this.serverStatus);
      }

      this.log('App online', data);
    } catch (error) {
      this.log('Failed to parse app_online event', error);
      this.addLog('receive', event.data);
    }
  }

  private handleAppOfflineEvent(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data as string);
      this.addLog('receive', { event: 'app_offline', data });

      if (this.serverStatus) {
        this.serverStatus.appOnline = false;
      }

      this.emit('app:offline', undefined as never);
      this.log('App offline');
    } catch (error) {
      this.log('Failed to parse app_offline event', error);
      this.addLog('receive', event.data);
    }
  }

  private handleDataUpdateEvent(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data as string);
      this.addLog('receive', { event: 'data_update', data });

      if (this.serverStatus) {
        if (typeof data.appOnline === 'boolean') {
          this.serverStatus.appOnline = data.appOnline;
        }
        if (data.tools) this.serverStatus.tools = data.tools;
        if (data.libraries) this.serverStatus.libraries = data.libraries;
        if (data.knowledgeBases) this.serverStatus.knowledgeBases = data.knowledgeBases;
        this.emit('app:data-update', this.serverStatus);
      }

      this.log('Data updated', data);
    } catch (error) {
      this.log('Failed to parse data_update event', error);
      this.addLog('receive', event.data);
    }
  }

  private handleMessageEvent(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data as string);
      this.addLog('receive', { event: 'message', data });

      // 处理流式消息（ExchangeStreamMessage 格式）
      // 格式: { content, finished, chunk_index, conversation_id, message_index? }
      if ('chunk_index' in data && typeof data.content === 'string') {
        const streamData = data as ServerStreamMessage & { message_index?: number };
        const chunk: StreamChunk = {
          content: streamData.content,
          chunkIndex: streamData.chunk_index,
          finished: streamData.finished,
          conversationId: streamData.conversation_id,
          messageIndex: streamData.message_index,
        };

        this.emit('message:stream', chunk);

        if (streamData.finished) {
          // 流式消息完成时，也发送 complete 事件
          this.emit('message:complete', {
            role: 'assistant',
            content: '', // 流式消息的完整内容由调用方累积
            conversationId: streamData.conversation_id,
            finished: true,
            messageIndex: streamData.message_index,
          });
        }
        return;
      }

      // 处理完整消息响应
      const completeData = data as ServerCompleteMessage & { message_index?: number };
      if (completeData.type === 'chat' && completeData.message) {
        const content = String(completeData.message.content || completeData.message.text || '');
        const finished = Boolean(completeData.message.finished);
        const hasToolCalls = Boolean(completeData.message.has_tool_calls);
        const messageIndex = completeData.message_index;

        this.emit('message:complete', {
          role: 'assistant',
          content,
          conversationId: completeData.conversation_id || '',
          finished,
          hasToolCalls,
          messageIndex,
        });
      }

      // 处理工具调用开始事件
      // 格式: { type: 'tool_call_start', tool_calls: [...], message_index, conversation_id }
      if (completeData.type === 'tool_call' && completeData.message) {
        // 检查是否是工具调用开始
        if (
          'tool_calls' in completeData.message &&
          Array.isArray(completeData.message.tool_calls)
        ) {
          const toolCalls = completeData.message.tool_calls as Array<{
            id: string;
            function: { name: string; arguments: string };
          }>;
          const startEvent: ToolCallStartEvent = {
            conversationId: completeData.conversation_id || '',
            toolCalls: toolCalls.map((tc) => ({
              id: tc.id,
              name: tc.function.name,
              arguments: JSON.parse(tc.function.arguments || '{}'),
            })),
            messageIndex: (completeData.message.message_index as number) || 0,
          };
          this.emit('tool:start', startEvent);
          return;
        }

        // 检查是否是工具执行结果
        if ('tool_call_id' in completeData.message) {
          const msg = completeData.message as {
            tool_call_id: string;
            tool_name?: string;
            content?: string;
            success?: boolean;
            message_index?: number;
          };
          const resultEvent: ToolExecutionResult = {
            conversationId: completeData.conversation_id || '',
            toolCallId: msg.tool_call_id,
            toolName: msg.tool_name || '',
            result: msg.content || '',
            success: msg.success ?? true,
            messageIndex: msg.message_index || 0,
          };
          this.emit('tool:result', resultEvent);
          return;
        }

        // 兼容旧的工具调用响应格式
        const result: ToolCallResult = {
          toolName: (completeData.message.tool_name as string) || '',
          result: completeData.message,
          success: !completeData.message.error,
          conversationId: completeData.conversation_id || '',
        };
        this.emit('tool:complete', result);
      }
    } catch (error) {
      this.log('Failed to parse message event', error);
      this.addLog('receive', event.data);
    }
  }

  private scheduleReconnect(): void {
    if (!this.config.autoReconnect) {
      this.log('Auto-reconnect disabled');
      return;
    }

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log('Max reconnect attempts reached');
      this.setStatus('error', 'Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * this.reconnectAttempts;

    this.log(
      `Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.log('Attempting reconnect...');
      void this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private async postRelay(message: RelayMessage): Promise<void> {
    this.addLog('send', { endpoint: 'POST /relay', data: message });

    try {
      const response = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.RELAY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      this.addLog('receive', { endpoint: 'POST /relay response', result });

      if (!response.ok) {
        const errorMessage = (result as { error?: string }).error || `HTTP ${response.status}`;
        this.log('Relay failed', errorMessage);

        if (message.type === 'chat') {
          this.emit('message:error', {
            message: errorMessage,
            conversationId: message.conversation_id,
          });
        } else if (message.type === 'tool_call') {
          this.emit('tool:error', {
            toolName: (message.message as { tool_name: string }).tool_name,
            message: errorMessage,
            conversationId: message.conversation_id,
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log('Relay error', errorMessage);

      if (message.type === 'chat') {
        this.emit('message:error', {
          message: errorMessage,
          conversationId: message.conversation_id,
        });
      } else if (message.type === 'tool_call') {
        this.emit('tool:error', {
          toolName: (message.message as { tool_name: string }).tool_name,
          message: errorMessage,
          conversationId: message.conversation_id,
        });
      }
    }
  }

  /**
   * 从服务器获取工具列表
   */
  async fetchTools(): Promise<Tool[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.GET_TOOLS}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      this.addLog('receive', { endpoint: 'GET /get_tools', data });

      if (data.tools && Array.isArray(data.tools)) {
        if (this.serverStatus) {
          this.serverStatus.tools = data.tools;
        }
        return data.tools;
      }

      return [];
    } catch (error) {
      this.log('Failed to fetch tools', error);
      return [];
    }
  }
}
