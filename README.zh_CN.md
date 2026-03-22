# openbot-weixin

[English](./README.md)

---

## 致谢

本项目 fork 自 [Tencent 的 openclaw-weixin](https://github.com/tencent/openclaw-weixin) 渠道插件。感谢 Tencent 对微信生态的开源贡献。

## 概述

`openbot-weixin` 是一个**纯净的微信 API 客户端库**，可以通过简单清晰的 API 与微信/Weixin 进行交互。它设计为框架无关——无需 OpenClaw 或其他框架依赖。

### 使用这个库可以实现：

- **扫码登录** — 通过扫描二维码完成微信认证
- **长轮询消息** — 通过 getUpdates 轮询接收入站消息
- **发送消息** — 发送文本、图片、视频、文件和语音消息
- **CDN 媒体上传/下载** — 处理带 AES-128-ECB 加密的媒体文件
- **输入状态指示** — 向用户发送/取消输入状态

## 安装

```bash
npm install openbot-weixin
```

## 快速开始

### 1. 扫码登录

```typescript
import { loginWithQr, waitForLogin, saveWeixinAccount } from "openbot-weixin";

const account = await loginWithQr({
  baseUrl: "https://ilinkai.weixin.qq.com",
  onQRCode: (dataUrl) => {
    // 向用户展示二维码
    console.log("请扫描此二维码:", dataUrl);
  },
});

const result = await waitForLogin(account);

if (result.status === "confirmed") {
  // 保存凭证以供后续使用
  saveWeixinAccount(result.accountId, {
    token: result.token,
    userId: result.userId,
  });
  console.log("登录成功！");
}
```

### 2. 创建消息轮询器

```typescript
import { createPoller, type TextMessage, type MediaMessage } from "openbot-weixin";

const account = {
  accountId: "my-bot",
  baseUrl: "https://ilinkai.weixin.qq.com",
  cdnBaseUrl: "https://novac2c.cdn.weixin.qq.com/c2c",
  token: "your-token-here",
  enabled: true,
  configured: true,
};

const poller = createPoller({
  account,

  callbacks: {
    onTextMessage: async (msg: TextMessage) => {
      console.log(`收到来自 ${msg.fromUserId} 的消息: ${msg.content}`);

      // 回复相同内容（回显示例）
      // 生产环境中，这里应该接入你的 AI 后端
      if (callbacks.sendText) {
        await callbacks.sendText({
          to: msg.fromUserId,
          text: `回显: ${msg.content}`,
          contextToken: msg.contextToken,
        });
      }
    },

    onMediaMessage: async (msg: MediaMessage) => {
      console.log(`收到来自 ${msg.fromUserId} 的媒体消息:`);
      console.log(`  类型: ${msg.mediaType}`);
      console.log(`  路径: ${msg.mediaPath}`);
    },

    onError: (err, context) => {
      console.error(`${context} 中发生错误:`, err);
    },

    // 实现 sendText 来回复消息
    sendText: async ({ to, text, contextToken }) => {
      await sendMessageWeixin({
        to,
        text,
        opts: { baseUrl: account.baseUrl, token: account.token, contextToken },
      });
    },
  },

  onStatusChange: (status) => {
    console.log(`连接状态: ${status.connected ? "已连接" : "已断开"}`);
  },
});

// 需要停止时: poller.stop()
```

### 3. 直接发送消息

```typescript
import { sendMessageWeixin, sendImageMessageWeixin } from "openbot-weixin";

// 发送文本消息
await sendMessageWeixin({
  to: "user-id",
  text: "你好，来自 openbot-weixin！",
  opts: {
    baseUrl: "https://ilinkai.weixin.qq.com",
    token: "your-token",
    contextToken: "context-token-from-inbound-message",
  },
});

// 发送图片（需先上传到 CDN）
await sendImageMessageWeixin({
  to: "user-id",
  text: "这是一张图片",
  uploaded: {
    filekey: "上传后得到的 file-key",
    aeskey: Buffer.from("your-32-byte-key"),
    fileSize: 12345,
    fileSizeCiphertext: 12352,
    downloadEncryptedQueryParam: "encrypted-param",
  },
  opts: {
    baseUrl: "https://ilinkai.weixin.qq.com",
    token: "your-token",
    contextToken: "context-token",
  },
});
```

### 4. 手动处理入站消息

如果需要更多控制权：

```typescript
import { getUpdates } from "openbot-weixin";

async function messageLoop() {
  let syncBuf = "";

  while (true) {
    const resp = await getUpdates({
      baseUrl: account.baseUrl,
      token: account.token,
      get_updates_buf: syncBuf,
      timeoutMs: 35000,
    });

    if (resp.get_updates_buf) {
      syncBuf = resp.get_updates_buf;
    }

    for (const msg of resp.msgs ?? []) {
      // 处理每条消息
      const text = msg.item_list?.[0]?.text_item?.text ?? "";
      console.log(`收到来自 ${msg.from_user_id} 的消息: ${text}`);
    }
  }
}
```

## API 参考

### 核心导出

| 导出 | 说明 |
|------|------|
| `loginWithQr` / `waitForLogin` | 扫码登录流程 |
| `createPoller` | 启动带回调的长轮询消息循环 |
| `sendMessageWeixin` | 发送文本消息 |
| `sendImageMessageWeixin` | 发送图片 |
| `sendVideoMessageWeixin` | 发送视频 |
| `sendFileMessageWeixin` | 发送文件 |
| `getUpdates` | 长轮询获取新消息 |
| `resolveWeixinAccount` | 从配置文件解析账号配置 |
| `loadWeixinAccount` / `saveWeixinAccount` | 管理存储的凭证 |
| `markdownToPlainText` | 将 markdown 转换为纯文本 |
| `normalizeAccountId` | 标准化账户 ID（文件系统安全） |

### 类型

| 类型 | 说明 |
|------|------|
| `TextMessage` | 入站文本消息 |
| `MediaMessage` | 入站媒体消息 |
| `ResolvedWeixinAccount` | 解析后的账号（含凭证） |
| `WeixinMessageCallbacks` | 消息处理回调接口 |
| `InboundMessage` | 统一的入站消息 |

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](./LICENSE)。

## 后端 API 协议

对于需要对接自有后端的开发者，本库通过 HTTP JSON API 与后端网关通信。协议文档见 [docs](./docs) 目录。
