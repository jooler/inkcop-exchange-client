# InkCop Exchange Client

[![npm version](https://img.shields.io/npm/v/inkcop-exchange-client.svg)](https://www.npmjs.com/package/inkcop-exchange-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

框架无关的 InkCop Exchange Server 客户端 SDK。

[English](./README.md)

## 特性

- 🔌 **SSE 连接** - 通过 Server-Sent Events 实现实时通信
- 🔄 **自动重连** - 可配置重连策略的自动重连机制
- 📡 **事件驱动** - 所有状态变化和消息通过事件暴露
- 🌊 **流式响应** - 支持 AI 实时流式响应
- 🛠️ **工具调用** - 支持调用服务端注册的工具
- 📦 **TypeScript** - 完整的 TypeScript 类型定义
- 🎯 **框架无关** - 可与任何 UI 框架或原生 JS 配合使用

## 安装

```bash
npm install inkcop-exchange-client
# 或
bun add inkcop-exchange-client
```

## 快速开始

```typescript
import { InkcopExchangeClient } from 'inkcop-exchange-client';

const client = new InkcopExchangeClient({
  baseUrl: 'http://localhost:9200',
  debug: true,
});

// 监听事件
client.on('connection:connected', (status) => {
  console.log('已连接:', status.serverId);
  console.log('可用工具:', status.tools);
});

client.on('app:online', (data) => {
  console.log('App 上线');
});

client.on('message:stream', (chunk) => {
  process.stdout.write(chunk.content);
});

client.on('message:complete', (message) => {
  console.log('\n消息完成');
});

// 连接
await client.connect();

// 发送消息
await client.sendChat('你好！', {
  systemPrompt: '你是一个有帮助的助手',
  tools: ['search_web', 'search_knowledge'],
});

// 调用工具
await client.callTool('search_knowledge', {
  query: '唐诗',
  knowledge_base_ids: [1, 2, 3],
  limit: 5,
});

// 断开连接
client.disconnect();

// 销毁实例
client.destroy();
```

## API

### 构造函数

```typescript
new InkcopExchangeClient(config: ExchangeClientConfig)
```

#### 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `baseUrl` | `string` | - | Exchange 服务器地址（必填） |
| `clientId` | `string` | 自动生成 | 客户端 ID |
| `autoReconnect` | `boolean` | `true` | 是否自动重连 |
| `maxReconnectAttempts` | `number` | `5` | 最大重连次数 |
| `reconnectDelay` | `number` | `3000` | 重连延迟（毫秒） |
| `debug` | `boolean` | `false` | 调试模式 |

### 方法

- `connect(): Promise<boolean>` - 连接到服务器
- `disconnect(): void` - 断开连接
- `sendChat(content, options?): Promise<string>` - 发送聊天消息
- `callTool(name, args, options?): Promise<string>` - 调用工具
- `getStatus(): ConnectionStatus` - 获取连接状态
- `getServerStatus(): ServerStatus | null` - 获取服务器状态
- `isConnected(): boolean` - 是否已连接
- `isAppOnline(): boolean` - App 是否在线
- `getTools(): Tool[]` - 获取工具列表
- `getLibraries(): LibraryInfo[]` - 获取库列表
- `getKnowledgeBases(): KnowledgeBaseInfo[]` - 获取知识库列表
- `destroy(): void` - 销毁实例

### 事件

| 事件 | 数据 | 说明 |
|------|------|------|
| `connection:status` | `{ status, error? }` | 连接状态变化 |
| `connection:connected` | `ServerStatus` | 连接成功 |
| `connection:disconnected` | - | 连接断开 |
| `connection:error` | `Error` | 连接错误 |
| `app:online` | `ServerStatus` | App 上线 |
| `app:offline` | - | App 离线 |
| `app:data-update` | `ServerStatus` | 数据更新 |
| `message:stream` | `StreamChunk` | 流式消息 |
| `message:complete` | `CompletedMessage` | 消息完成 |
| `message:error` | `{ message, conversationId }` | 消息错误 |
| `tool:result` | `ToolCallResult` | 工具调用结果 |
| `tool:error` | `{ toolName, message, conversationId }` | 工具调用错误 |

## TypeScript 支持

本包使用 TypeScript 编写，包含完整的类型定义。所有类型均从主模块导出：

```typescript
import type {
  ExchangeClientConfig,
  ConnectionStatus,
  ServerStatus,
  Tool,
  StreamChunk,
  CompletedMessage,
  ToolCallResult,
} from 'inkcop-exchange-client';
```

## 许可证

MIT © [JERR](mailto:jerr@foxmail.com)
