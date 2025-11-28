# InkCop Exchange Client - Pure JS Example

这是一个纯 JavaScript/HTML 的示例页面，展示如何使用 `@inkcop/exchange-client` 包。

## 配置

- **Base URL**: `https://exchange.inkcop.yihu.team`
- **模式**: Chat 对话模式
- **工具**: 默认启用所有可用工具
- **示例提示词**: "What tools do you have available?"

## 如何运行

由于浏览器的 CORS 策略限制，不能直接通过 `file://` 协议打开 HTML 文件。需要通过 HTTP 服务器运行。

### 方法 1: 使用 serve (推荐)

在项目根目录运行：

```bash
npx serve -p 3000
```

然后在浏览器中访问：
```
http://localhost:3000/src/example/index.html
```

### 方法 2: 使用 Python 内置服务器

如果你安装了 Python，可以在项目根目录运行：

```bash
# Python 3
python -m http.server 3000

# Python 2
python -m SimpleHTTPServer 3000
```

然后在浏览器中访问：
```
http://localhost:3000/src/example/index.html
```

### 方法 3: 使用 Node.js http-server

```bash
npx http-server -p 3000
```

然后在浏览器中访问：
```
http://localhost:3000/src/example/index.html
```

## 功能特性

- ✅ 自动连接到 Exchange 服务器
- ✅ 实时流式消息显示
- ✅ 工具调用支持（自动启用所有工具）
- ✅ 对话历史管理
- ✅ 工具执行结果显示
- ✅ 连接状态指示

## 注意事项

1. 确保已经构建了 `@inkcop/exchange-client` 包（`dist/index.mjs` 存在）
2. 如果修改了源代码，需要重新构建：`npm run build`
3. 浏览器需要支持 ES Modules
