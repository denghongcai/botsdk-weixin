# botsdk-weixin

[简体中文](./README.zh_CN.md)

---

## Acknowledgments

This project is forked from [Tencent's openclaw-weixin](https://github.com/tencent/openclaw-weixin) channel plugin. We thank Tencent for their open-source contribution to the WeChat/Weixin ecosystem.

## Overview

`botsdk-weixin` is a **pure WeChat API client library** that allows you to interact with WeChat/Weixin through a simple and clean API. It is designed to be framework-agnostic — no OpenClaw or other framework dependencies required.

### Features

- **QR Code Login** — Authenticate with WeChat using QR code scanning
- **Async Iterable Polling** — Receive messages via `for await...of`
- **Send Messages** — Send text, images, videos, files, and voice messages
- **CDN Media Upload/Download** — Handle media with AES-128-ECB encryption

## Installation

```bash
npm install botsdk-weixin
```

## Quick Start

### 1. QR Code Login

```typescript
import { loginWithQr, waitForLogin } from "botsdk-weixin";

const login = await loginWithQr({
  apiBaseUrl: "https://ilinkai.weixin.qq.com",
  routeTag: undefined, // optional
});

console.log("Scan QR:", login.qrcodeUrl);

const result = await waitForLogin({
  sessionKey: login.sessionKey,
  apiBaseUrl: "https://ilinkai.weixin.qq.com",
  routeTag: undefined,
});

if (result.connected) {
  // Caller manages credentials - save to your own storage
  const account = {
    accountId: result.accountId,
    token: result.botToken,
    baseUrl: result.baseUrl,
    cdnBaseUrl: "https://novac2c.cdn.weixin.qq.com/c2c",
    userId: result.userId,
  };
  console.log("Login successful!");
}
```

### 2. Poll for Messages (Async Iterable)

```typescript
import { createPoller } from "botsdk-weixin";

// Caller manages syncBuf and credentials
const syncBuf = { value: "" };
const controller = new AbortController();

const poller = createPoller({
  account,
  syncBuf,
  onSyncBufUpdate: (buf) => { syncBuf.value = buf; /* persist */ },
  onStatusChange: (s) => console.log("Status:", s),
  abortSignal: controller.signal,
});

try {
  for await (const msg of poller.messages()) {
    console.log(`${msg.fromUserId}: ${msg.content}`);

    // Save contextToken for replying
    // const token = msg.contextToken;
  }
} catch (err) {
  // Network/API errors thrown here
  console.error("Poller error:", err);
}

// Stop polling
controller.abort();
```

### 3. Send Messages

```typescript
import { sendMessageWeixin, sendImageMessageWeixin } from "botsdk-weixin";

// contextToken is required from inbound message
await sendMessageWeixin({
  to: "user-id",
  text: "Hello!",
  opts: {
    baseUrl: account.baseUrl,
    token: account.token,
    routeTag: account.routeTag,
    contextToken: "context-token-from-inbound",
  },
});
```

## API Reference

### Core Exports

| Export | Description |
|--------|-------------|
| `loginWithQr` / `waitForLogin` | QR code login flow |
| `createPoller` | Start polling via async iterable |
| `sendMessageWeixin` | Send a text message |
| `sendImageMessageWeixin` | Send an image |
| `sendVideoMessageWeixin` | Send a video |
| `sendFileMessageWeixin` | Send a file |
| `getUpdates` | Low-level long-poll API |
| `markdownToPlainText` | Convert markdown to plain text |

### Types

| Type | Description |
|------|-------------|
| `WeixinAccount` | Account credentials object |
| `SyncBuf` | Sync buffer state container |
| `InboundMessage` | Union of TextMessage or MediaMessage |
| `TextMessage` | Inbound text message |
| `MediaMessage` | Inbound media message |

## Examples

See the [examples](./examples/) directory for complete examples:

- `examples/1-login.ts` — QR code login
- `examples/2-poller.ts` — Async iterable polling
- `examples/3-send.ts` — Send messages
- `examples/4-context-tokens.ts` — Context token management

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

## Backend API Protocol

For developers integrating with their own backend, this library communicates with the backend gateway via HTTP JSON API. The protocol documentation is preserved in the [docs](./docs) directory.
