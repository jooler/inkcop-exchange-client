import { v4 } from 'uuid';

// src/client.ts

// src/constants.ts
var DEFAULT_CONFIG = {
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 3e3,
  debug: false
};
var SSE_EVENTS = {
  CONNECTED: "connected",
  APP_ONLINE: "app_online",
  APP_OFFLINE: "app_offline",
  DATA_UPDATE: "data_update",
  MESSAGE: "message"
};
var API_ENDPOINTS = {
  EVENTS: "/events",
  RELAY: "/relay",
  GET_TOOLS: "/get_tools"
};

// src/client.ts
var InkcopExchangeClient = class {
  config;
  eventSource = null;
  status = "disconnected";
  serverStatus = null;
  reconnectAttempts = 0;
  reconnectTimer = null;
  // 事件监听器存储
  listeners = /* @__PURE__ */ new Map();
  // 消息日志（调试用）
  messageLogs = [];
  maxLogEntries = 100;
  constructor(config) {
    this.config = this.normalizeConfig(config);
    this.log("Client initialized", this.config);
  }
  // ==================== 公开 API ====================
  /**
   * 连接到 Exchange 服务器
   */
  async connect() {
    if (this.status === "connected") {
      this.log("Already connected");
      return true;
    }
    if (this.status === "connecting") {
      this.log("Connection in progress");
      return false;
    }
    this.setStatus("connecting");
    return new Promise((resolve) => {
      try {
        const sseUrl = `${this.config.baseUrl}${API_ENDPOINTS.EVENTS}?id=${encodeURIComponent(this.config.clientId)}`;
        this.log("Connecting to", sseUrl);
        this.eventSource = new EventSource(sseUrl);
        this.setupEventSourceHandlers(resolve);
      } catch (error) {
        this.log("Connection failed", error);
        this.setStatus("error", String(error));
        resolve(false);
      }
    });
  }
  /**
   * 断开连接
   */
  disconnect() {
    this.log("Disconnecting...");
    this.clearReconnectTimer();
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.setStatus("disconnected");
    this.serverStatus = null;
    this.reconnectAttempts = 0;
  }
  /**
   * 发送聊天消息
   * @param content 当前用户消息内容
   * @param options 选项，包括对话历史、系统提示词、工具等
   */
  async sendChat(content, options = {}) {
    const conversationId = options.conversationId || v4();
    const message = {
      type: "chat",
      conversation_id: conversationId,
      client_id: [this.config.clientId],
      message: {
        content,
        role: "user",
        ...options.systemPrompt && { system_prompt: options.systemPrompt },
        ...options.tools && options.tools.length > 0 && { tools: options.tools },
        ...options.messages && options.messages.length > 0 && { messages: options.messages }
      }
    };
    await this.postRelay(message);
    return conversationId;
  }
  /**
   * 调用工具
   */
  async callTool(toolName, args, options = {}) {
    const conversationId = options.conversationId || v4();
    const message = {
      type: "tool_call",
      conversation_id: conversationId,
      client_id: [this.config.clientId],
      message: {
        tool_name: toolName,
        arguments: args
      }
    };
    await this.postRelay(message);
    return conversationId;
  }
  // ==================== 状态查询 ====================
  getStatus() {
    return this.status;
  }
  getServerStatus() {
    return this.serverStatus;
  }
  isConnected() {
    return this.status === "connected";
  }
  isAppOnline() {
    return this.serverStatus?.appOnline ?? false;
  }
  getTools() {
    return this.serverStatus?.tools ?? [];
  }
  getLibraries() {
    return this.serverStatus?.libraries ?? [];
  }
  getKnowledgeBases() {
    return this.serverStatus?.knowledgeBases ?? [];
  }
  getClientId() {
    return this.config.clientId;
  }
  getMessageLogs() {
    return [...this.messageLogs];
  }
  clearMessageLogs() {
    this.messageLogs = [];
  }
  // ==================== 事件系统 ====================
  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, /* @__PURE__ */ new Set());
    }
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.add(listener);
    }
    return this;
  }
  off(event, listener) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
    return this;
  }
  once(event, listener) {
    const onceListener = ((data) => {
      this.off(event, onceListener);
      listener(data);
    });
    return this.on(event, onceListener);
  }
  emit(event, data) {
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
  destroy() {
    this.disconnect();
    this.listeners.clear();
    this.messageLogs = [];
    this.log("Client destroyed");
  }
  // ==================== 内部方法 ====================
  normalizeConfig(config) {
    return {
      baseUrl: config.baseUrl.replace(/\/$/, ""),
      // 移除末尾斜杠
      clientId: config.clientId || `client-${v4().slice(0, 8)}`,
      autoReconnect: config.autoReconnect ?? DEFAULT_CONFIG.autoReconnect,
      maxReconnectAttempts: config.maxReconnectAttempts ?? DEFAULT_CONFIG.maxReconnectAttempts,
      reconnectDelay: config.reconnectDelay ?? DEFAULT_CONFIG.reconnectDelay,
      debug: config.debug ?? DEFAULT_CONFIG.debug
    };
  }
  setStatus(status, error) {
    this.status = status;
    this.emit("connection:status", { status, error });
    if (status === "disconnected") {
      this.emit("connection:disconnected", void 0);
    } else if (status === "error" && error) {
      this.emit("connection:error", new Error(error));
    }
  }
  log(...args) {
    if (this.config.debug) {
      console.log("[ExchangeClient]", ...args);
    }
  }
  addLog(direction, data) {
    const entry = {
      direction,
      data,
      timestamp: Date.now()
    };
    this.messageLogs.unshift(entry);
    if (this.messageLogs.length > this.maxLogEntries) {
      this.messageLogs = this.messageLogs.slice(0, this.maxLogEntries);
    }
    this.emit(direction === "send" ? "raw:send" : "raw:receive", entry);
  }
  setupEventSourceHandlers(resolveConnect) {
    if (!this.eventSource) return;
    this.eventSource.onopen = () => {
      this.log("SSE connection opened");
    };
    this.eventSource.addEventListener(SSE_EVENTS.CONNECTED, (event) => {
      this.handleConnectedEvent(event);
      resolveConnect(true);
    });
    this.eventSource.addEventListener(SSE_EVENTS.APP_ONLINE, (event) => {
      this.handleAppOnlineEvent(event);
    });
    this.eventSource.addEventListener(SSE_EVENTS.APP_OFFLINE, (event) => {
      this.handleAppOfflineEvent(event);
    });
    this.eventSource.addEventListener(SSE_EVENTS.DATA_UPDATE, (event) => {
      this.handleDataUpdateEvent(event);
    });
    this.eventSource.addEventListener(SSE_EVENTS.MESSAGE, (event) => {
      this.handleMessageEvent(event);
    });
    this.eventSource.onerror = () => {
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.log("SSE connection closed");
        this.setStatus("disconnected");
        this.scheduleReconnect();
      } else {
        this.log("SSE connection error, attempting recovery...");
      }
    };
  }
  handleConnectedEvent(event) {
    try {
      const data = JSON.parse(event.data);
      this.addLog("receive", { event: "connected", data });
      this.serverStatus = {
        clientId: data.clientId || this.config.clientId,
        serverId: data.serverId || "",
        appOnline: data.appOnline || false,
        tools: data.tools || [],
        libraries: data.libraries || [],
        knowledgeBases: data.knowledgeBases || []
      };
      this.setStatus("connected");
      this.reconnectAttempts = 0;
      this.emit("connection:connected", this.serverStatus);
      this.log("Connected to server", this.serverStatus);
    } catch (error) {
      this.log("Failed to parse connected event", error);
      this.addLog("receive", event.data);
    }
  }
  handleAppOnlineEvent(event) {
    try {
      const data = JSON.parse(event.data);
      this.addLog("receive", { event: "app_online", data });
      if (this.serverStatus) {
        this.serverStatus.appOnline = true;
        if (data.tools) this.serverStatus.tools = data.tools;
        if (data.libraries) this.serverStatus.libraries = data.libraries;
        if (data.knowledgeBases) this.serverStatus.knowledgeBases = data.knowledgeBases;
        this.emit("app:online", this.serverStatus);
      }
      this.log("App online", data);
    } catch (error) {
      this.log("Failed to parse app_online event", error);
      this.addLog("receive", event.data);
    }
  }
  handleAppOfflineEvent(event) {
    try {
      const data = JSON.parse(event.data);
      this.addLog("receive", { event: "app_offline", data });
      if (this.serverStatus) {
        this.serverStatus.appOnline = false;
      }
      this.emit("app:offline", void 0);
      this.log("App offline");
    } catch (error) {
      this.log("Failed to parse app_offline event", error);
      this.addLog("receive", event.data);
    }
  }
  handleDataUpdateEvent(event) {
    try {
      const data = JSON.parse(event.data);
      this.addLog("receive", { event: "data_update", data });
      if (this.serverStatus) {
        if (typeof data.appOnline === "boolean") {
          this.serverStatus.appOnline = data.appOnline;
        }
        if (data.tools) this.serverStatus.tools = data.tools;
        if (data.libraries) this.serverStatus.libraries = data.libraries;
        if (data.knowledgeBases) this.serverStatus.knowledgeBases = data.knowledgeBases;
        this.emit("app:data-update", this.serverStatus);
      }
      this.log("Data updated", data);
    } catch (error) {
      this.log("Failed to parse data_update event", error);
      this.addLog("receive", event.data);
    }
  }
  handleMessageEvent(event) {
    try {
      const data = JSON.parse(event.data);
      this.addLog("receive", { event: "message", data });
      if ("chunk_index" in data && typeof data.content === "string") {
        const streamData = data;
        const chunk = {
          content: streamData.content,
          chunkIndex: streamData.chunk_index,
          finished: streamData.finished,
          conversationId: streamData.conversation_id,
          messageIndex: streamData.message_index
        };
        this.emit("message:stream", chunk);
        if (streamData.finished) {
          this.emit("message:complete", {
            role: "assistant",
            content: "",
            // 流式消息的完整内容由调用方累积
            conversationId: streamData.conversation_id,
            finished: true,
            messageIndex: streamData.message_index
          });
        }
        return;
      }
      const completeData = data;
      if (completeData.type === "chat" && completeData.message) {
        const content = String(completeData.message.content || completeData.message.text || "");
        const finished = Boolean(completeData.message.finished);
        const hasToolCalls = Boolean(completeData.message.has_tool_calls);
        const messageIndex = completeData.message_index;
        this.emit("message:complete", {
          role: "assistant",
          content,
          conversationId: completeData.conversation_id || "",
          finished,
          hasToolCalls,
          messageIndex
        });
      }
      if (completeData.type === "tool_call" && completeData.message) {
        if ("tool_calls" in completeData.message && Array.isArray(completeData.message.tool_calls)) {
          const toolCalls = completeData.message.tool_calls;
          const startEvent = {
            conversationId: completeData.conversation_id || "",
            toolCalls: toolCalls.map((tc) => ({
              id: tc.id,
              name: tc.function.name,
              arguments: JSON.parse(tc.function.arguments || "{}")
            })),
            messageIndex: completeData.message.message_index || 0
          };
          this.emit("tool:start", startEvent);
          return;
        }
        if ("tool_call_id" in completeData.message) {
          const msg = completeData.message;
          const resultEvent = {
            conversationId: completeData.conversation_id || "",
            toolCallId: msg.tool_call_id,
            toolName: msg.tool_name || "",
            result: msg.content || "",
            success: msg.success ?? true,
            messageIndex: msg.message_index || 0
          };
          this.emit("tool:result", resultEvent);
          return;
        }
        const result = {
          toolName: completeData.message.tool_name || "",
          result: completeData.message,
          success: !completeData.message.error,
          conversationId: completeData.conversation_id || ""
        };
        this.emit("tool:complete", result);
      }
    } catch (error) {
      this.log("Failed to parse message event", error);
      this.addLog("receive", event.data);
    }
  }
  scheduleReconnect() {
    if (!this.config.autoReconnect) {
      this.log("Auto-reconnect disabled");
      return;
    }
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log("Max reconnect attempts reached");
      this.setStatus("error", "Max reconnect attempts reached");
      return;
    }
    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * this.reconnectAttempts;
    this.log(
      `Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`
    );
    this.reconnectTimer = setTimeout(() => {
      this.log("Attempting reconnect...");
      void this.connect();
    }, delay);
  }
  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  async postRelay(message) {
    this.addLog("send", { endpoint: "POST /relay", data: message });
    try {
      const response = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.RELAY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(message)
      });
      const result = await response.json();
      this.addLog("receive", { endpoint: "POST /relay response", result });
      if (!response.ok) {
        const errorMessage = result.error || `HTTP ${response.status}`;
        this.log("Relay failed", errorMessage);
        if (message.type === "chat") {
          this.emit("message:error", {
            message: errorMessage,
            conversationId: message.conversation_id
          });
        } else if (message.type === "tool_call") {
          this.emit("tool:error", {
            toolName: message.message.tool_name,
            message: errorMessage,
            conversationId: message.conversation_id
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log("Relay error", errorMessage);
      if (message.type === "chat") {
        this.emit("message:error", {
          message: errorMessage,
          conversationId: message.conversation_id
        });
      } else if (message.type === "tool_call") {
        this.emit("tool:error", {
          toolName: message.message.tool_name,
          message: errorMessage,
          conversationId: message.conversation_id
        });
      }
    }
  }
  /**
   * 从服务器获取工具列表
   */
  async fetchTools() {
    try {
      const response = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.GET_TOOLS}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      this.addLog("receive", { endpoint: "GET /get_tools", data });
      if (data.tools && Array.isArray(data.tools)) {
        if (this.serverStatus) {
          this.serverStatus.tools = data.tools;
        }
        return data.tools;
      }
      return [];
    } catch (error) {
      this.log("Failed to fetch tools", error);
      return [];
    }
  }
};

export { API_ENDPOINTS, DEFAULT_CONFIG, InkcopExchangeClient, SSE_EVENTS };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map