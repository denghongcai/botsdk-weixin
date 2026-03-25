# botsdk-weixin

[English](./README.md)

---

## 致谢

本项目 fork 自 [Tencent 的 openclaw-weixin](https://github.com/tencent/openclaw-weixin) 渠道插件。感谢 Tencent 对微信生态的开源贡献。

## 概述

`botsdk-weixin` 是一个**纯净的微信 API 客户端库**，可以通过简单清晰的 API 与微信/Weixin 进行交互。它设计为框架无关——无需 OpenClaw 或其他框架依赖。

### 功能

- **扫码登录** — 通过扫描二维码完成微信认证
- **Async Iterable 轮询** — 通过 `for await...of` 接收消息
- **发送消息** — 发送文本、图片、视频、文件和语音消息
- **CDN 媒体上传/下载** — 处理带 AES-128-ECB 加密的媒体文件

## 安装

```bash
npm install botsdk-weixin
```

## 快速开始

### 1. 扫码登录

```typescript
import { loginWithQr, waitForLogin } from "botsdk-weixin";

const login = await loginWithQr({
  apiBaseUrl: "https://ilinkai.weixin.qq.com",
  routeTag: undefined, // 可选
});

console.log("扫描二维码:", login.qrcodeUrl);

const result = await waitForLogin({
  sessionKey: login.sessionKey,
  apiBaseUrl: "https://ilinkai.weixin.qq.com",
  routeTag: undefined,
});

if (result.connected) {
  // 调用方管理凭证 - 保存到你自己的存储
  const account = {
    accountId: result.accountId,
    token: result.botToken,
    baseUrl: result.baseUrl,
    cdnBaseUrl: "https://novac2c.cdn.weixin.qq.com/c2c",
    userId: result.userId,
  };
  console.log("登录成功！");
}
```

### 2. 轮询消息（Async Iterable）

```typescript
import { createPoller } from "botsdk-weixin";

// 调用方管理 syncBuf 和凭证
const syncBuf = { value: "" };
const controller = new AbortController();

const poller = createPoller({
  account,
  syncBuf,
  onSyncBufUpdate: (buf) => { syncBuf.value = buf; /* 持久化 */ },
  onStatusChange: (s) => console.log("状态:", s),
  abortSignal: controller.signal,
});

try {
  for await (const msg of poller.messages()) {
    console.log(`${msg.fromUserId}: ${msg.content}`);

    // 保存 contextToken 用于回复
    // const token = msg.contextToken;
  }
} catch (err) {
  // 网络/API 错误会抛出到这里
  console.error("轮询错误:", err);
}

// 停止轮询
controller.abort();
```

### 3. 发送消息

```typescript
import { sendMessageWeixin, sendImageMessageWeixin } from "botsdk-weixin";

// contextToken 必需，从接收到的消息中获取
await sendMessageWeixin({
  to: "user-id",
  text: "你好！",
  opts: {
    baseUrl: account.baseUrl,
    token: account.token,
    routeTag: account.routeTag,
    contextToken: "context-token-from-inbound",
  },
});
```

## API 参考

### 核心导出

| 导出 | 说明 |
|------|------|
| `loginWithQr` / `waitForLogin` | 扫码登录流程 |
| `createPoller` | 通过 async iterable 启动轮询 |
| `sendMessageWeixin` | 发送文本消息 |
| `sendImageMessageWeixin` | 发送图片 |
| `sendVideoMessageWeixin` | 发送视频 |
| `sendFileMessageWeixin` | 发送文件 |
| `getUpdates` | 低层级长轮询 API |
| `markdownToPlainText` | 将 markdown 转换为纯文本 |

### 类型

| 类型 | 说明 |
|------|------|
| `WeixinAccount` | 账户凭证对象 |
| `SyncBuf` | 同步缓冲区状态容器 |
| `InboundMessage` | TextMessage 或 MediaMessage 的联合类型 |
| `TextMessage` | 入站文本消息 |
| `MediaMessage` | 入站媒体消息 |

## 示例

完整示例见 [examples](./examples/) 目录：

- `examples/1-login.ts` — 扫码登录
- `examples/2-poller.ts` — Async iterable 轮询
- `examples/3-send.ts` — 发送消息
- `examples/4-context-tokens.ts` — Context token 管理

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](./LICENSE)。

## 后端 API 协议

对于需要对接自有后端的开发者，本库通过 HTTP JSON API 与后端网关通信。协议文档见 [docs](./docs) 目录。
