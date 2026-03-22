# openbot-weixin

[简体中文](./README.zh_CN.md)

---

## Acknowledgments

This project is forked from [Tencent's openclaw-weixin](https://github.com/tencent/openclaw-weixin) channel plugin. We thank Tencent for their open-source contribution to the WeChat/Weixin ecosystem.

## Overview

`openbot-weixin` is a **pure WeChat API client library** that allows you to interact with WeChat/Weixin through a simple and clean API. It is designed to be framework-agnostic — no OpenClaw or other framework dependencies required.

### What you can do with this library:

- **QR Code Login** — Authenticate with WeChat using QR code scanning
- **Long-poll Messages** — Receive inbound messages via getUpdates polling
- **Send Messages** — Send text, images, videos, files, and voice messages
- **CDN Media Upload/Download** — Handle media with AES-128-ECB encryption
- **Typing Indicators** — Send/cancel typing status to users

## Installation

```bash
npm install openbot-weixin
```

## Quick Start

### 1. QR Code Login

```typescript
import { loginWithQr, waitForLogin, saveWeixinAccount } from "openbot-weixin";

const account = await loginWithQr({
  baseUrl: "https://ilinkai.weixin.qq.com",
  onQRCode: (dataUrl) => {
    // Display the QR code to the user
    console.log("Scan this QR code:", dataUrl);
  },
});

const result = await waitForLogin(account);

if (result.status === "confirmed") {
  // Save credentials for later use
  saveWeixinAccount(result.accountId, {
    token: result.token,
    userId: result.userId,
  });
  console.log("Login successful!");
}
```

### 2. Create a Message Poller

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
      console.log(`Received from ${msg.fromUserId}: ${msg.content}`);

      // Reply with the same text (echo example)
      // In production, you would integrate with your AI backend here
      if (callbacks.sendText) {
        await callbacks.sendText({
          to: msg.fromUserId,
          text: `Echo: ${msg.content}`,
          contextToken: msg.contextToken,
        });
      }
    },

    onMediaMessage: async (msg: MediaMessage) => {
      console.log(`Received media from ${msg.fromUserId}:`);
      console.log(`  Type: ${msg.mediaType}`);
      console.log(`  Path: ${msg.mediaPath}`);
    },

    onError: (err, context) => {
      console.error(`Error in ${context}:`, err);
    },

    // Implement sendText to reply to messages
    sendText: async ({ to, text, contextToken }) => {
      await sendMessageWeixin({
        to,
        text,
        opts: { baseUrl: account.baseUrl, token: account.token, contextToken },
      });
    },
  },

  onStatusChange: (status) => {
    console.log(`Connection status: ${status.connected ? "connected" : "disconnected"}`);
  },
});

// Later: poller.stop() to stop polling
```

### 3. Send Messages Directly

```typescript
import { sendMessageWeixin, sendImageMessageWeixin } from "openbot-weixin";

// Send a text message
await sendMessageWeixin({
  to: "user-id",
  text: "Hello from openbot-weixin!",
  opts: {
    baseUrl: "https://ilinkai.weixin.qq.com",
    token: "your-token",
    contextToken: "context-token-from-inbound-message",
  },
});

// Send an image (after uploading to CDN)
await sendImageMessageWeixin({
  to: "user-id",
  text: "Here's an image for you",
  uploaded: {
    filekey: "file-key-from-upload",
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

### 4. Process Inbound Messages Manually

If you prefer more control over the message loop:

```typescript
import { getUpdates, markdownToPlainText } from "openbot-weixin";

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
      // Process each message
      const text = msg.item_list?.[0]?.text_item?.text ?? "";
      console.log(`Message from ${msg.from_user_id}: ${text}`);
    }
  }
}
```

## API Reference

### Core Exports

| Export | Description |
|--------|-------------|
| `loginWithQr` / `waitForLogin` | QR code login flow |
| `createPoller` | Start a long-poll message loop with callbacks |
| `sendMessageWeixin` | Send a text message |
| `sendImageMessageWeixin` | Send an image |
| `sendVideoMessageWeixin` | Send a video |
| `sendFileMessageWeixin` | Send a file |
| `getUpdates` | Long-poll for new messages |
| `resolveWeixinAccount` | Resolve account config from config file |
| `loadWeixinAccount` / `saveWeixinAccount` | Manage stored credentials |
| `markdownToPlainText` | Convert markdown to plain text |
| `normalizeAccountId` | Normalize account IDs for filesystem safety |

### Types

| Type | Description |
|------|-------------|
| `TextMessage` | Inbound text message |
| `MediaMessage` | Inbound media message |
| `ResolvedWeixinAccount` | Resolved account with credentials |
| `WeixinMessageCallbacks` | Callbacks for message handling |
| `InboundMessage` | Unified inbound message |

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

## Backend API Protocol

For developers integrating with their own backend, this library communicates with the backend gateway via HTTP JSON API. The protocol documentation is preserved from the original project in the [docs](./docs) directory.
