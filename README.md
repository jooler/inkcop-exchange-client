# InkCop Exchange Client

[![npm version](https://img.shields.io/npm/v/inkcop-exchange-client.svg)](https://www.npmjs.com/package/inkcop-exchange-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A framework-agnostic client SDK for InkCop Exchange Server.

[中文文档](./README.zh-CN.md)

## Features

- 🔌 **SSE Connection** - Real-time communication via Server-Sent Events
- 🔄 **Auto Reconnect** - Automatic reconnection with configurable retry strategy
- 📡 **Event-Driven** - All state changes and messages exposed through events
- 🌊 **Streaming Support** - Real-time streaming response from AI
- 🛠️ **Tool Calls** - Support for calling server-registered tools
- 📦 **TypeScript** - Full TypeScript type definitions
- 🎯 **Framework Agnostic** - Works with any UI framework or vanilla JS

## Installation

```bash
npm install @inkcop/exchange-client
# or
yarn add @inkcop/exchange-client
# or
bun add @inkcop/exchange-client
```

## Quick Start

```typescript
import { InkcopExchangeClient } from '@inkcop/exchange-client';

const client = new InkcopExchangeClient({
  baseUrl: 'http://localhost:9200',
  debug: true,
});

// Listen to events
client.on('connection:connected', (status) => {
  console.log('Connected:', status.serverId);
  console.log('Available tools:', status.tools);
});

client.on('app:online', (data) => {
  console.log('App is online');
});

client.on('message:stream', (chunk) => {
  process.stdout.write(chunk.content);
});

client.on('message:complete', (message) => {
  console.log('\nMessage complete');
});

// Connect
await client.connect();

// Send a chat message
await client.sendChat('Hello!', {
  systemPrompt: 'You are a helpful assistant',
  tools: ['search_web', 'search_knowledge'],
});

// Call a tool
await client.callTool('search_knowledge', {
  query: 'poetry',
  knowledge_base_ids: [1, 2, 3],
  limit: 5,
});

// Disconnect
client.disconnect();

// Destroy the instance
client.destroy();
```

## API Reference

### Constructor

```typescript
new InkcopExchangeClient(config: ExchangeClientConfig)
```

#### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | - | Exchange server URL (required) |
| `clientId` | `string` | auto-generated | Client ID |
| `autoReconnect` | `boolean` | `true` | Enable auto-reconnection |
| `maxReconnectAttempts` | `number` | `5` | Maximum reconnection attempts |
| `reconnectDelay` | `number` | `3000` | Reconnection delay in milliseconds |
| `debug` | `boolean` | `false` | Enable debug mode |

### Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `connect()` | `Promise<boolean>` | Connect to the server |
| `disconnect()` | `void` | Disconnect from the server |
| `sendChat(content, options?)` | `Promise<string>` | Send a chat message |
| `callTool(name, args, options?)` | `Promise<string>` | Call a tool |
| `getStatus()` | `ConnectionStatus` | Get connection status |
| `getServerStatus()` | `ServerStatus \| null` | Get server status |
| `isConnected()` | `boolean` | Check if connected |
| `isAppOnline()` | `boolean` | Check if App is online |
| `getTools()` | `Tool[]` | Get available tools |
| `getLibraries()` | `LibraryInfo[]` | Get libraries |
| `getKnowledgeBases()` | `KnowledgeBaseInfo[]` | Get knowledge bases |
| `destroy()` | `void` | Destroy the instance |

### Events

| Event | Data | Description |
|-------|------|-------------|
| `connection:status` | `{ status, error? }` | Connection status changed |
| `connection:connected` | `ServerStatus` | Successfully connected |
| `connection:disconnected` | - | Disconnected |
| `connection:error` | `Error` | Connection error |
| `app:online` | `ServerStatus` | App came online |
| `app:offline` | - | App went offline |
| `app:data-update` | `ServerStatus` | Server data updated |
| `message:stream` | `StreamChunk` | Streaming message chunk |
| `message:complete` | `CompletedMessage` | Message completed |
| `message:error` | `{ message, conversationId }` | Message error |
| `tool:result` | `ToolCallResult` | Tool call result |
| `tool:error` | `{ toolName, message, conversationId }` | Tool call error |

## TypeScript Support

This package is written in TypeScript and includes full type definitions. All types are exported from the main module:

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

## License

MIT © [JERR](mailto:jerr@foxmail.com)
