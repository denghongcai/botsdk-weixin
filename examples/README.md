# Examples

These examples demonstrate how to use `botsdk-weixin` in your application.

## Quick Start

```typescript
import { loginWithQr, waitForLogin, createPoller } from "botsdk-weixin";

// 1. Login
const login = await loginWithQr({ apiBaseUrl: "https://ilinkai.weixin.qq.com" });
console.log(`Scan QR: ${login.qrcodeUrl}`);

const result = await waitForLogin({ sessionKey: login.sessionKey, apiBaseUrl });
if (!result.connected) throw new Error(result.message);

const account = {
  accountId: result.accountId,
  token: result.botToken,
  baseUrl: result.baseUrl,
  cdnBaseUrl: "https://novac2c.cdn.weixin.qq.com/c2c",
  userId: result.userId,
};

// 2. Poll for messages using async iterable
const syncBuf = { value: "" };
const controller = new AbortController();

const poller = createPoller({
  account,
  syncBuf,
  onSyncBufUpdate: (buf) => { syncBuf.value = buf; },
  abortSignal: controller.signal,
});

(async () => {
  try {
    for await (const msg of poller.messages()) {
      console.log(`${msg.fromUserId}: ${msg.type === "text" ? msg.content : "[media]"}`);
    }
  } catch (err) {
    console.error("Poller error:", err);
  }
})();

// 3. Stop
controller.abort();
```

## Examples

| File | Description |
|------|-------------|
| [1-login.ts](./1-login.ts) | QR code login flow |
| [2-poller.ts](./2-poller.ts) | Async iterable message polling |
| [3-send.ts](./3-send.ts) | Send text, image, video, file messages |
| [4-context-tokens.ts](./4-context-tokens.ts) | Context token management pattern |

## Running Examples

```bash
# Login example
npx tsx examples/1-login.ts

# Poller example
npx tsx examples/2-poller.ts

# Send example
npx tsx examples/3-send.ts

# Context tokens example
npx tsx examples/4-context-tokens.ts
```

## Key Concepts

### Async Iterable Poller

Messages are received via `for await...of` loop:

```typescript
const controller = new AbortController();
const poller = createPoller({ account, syncBuf, abortSignal: controller.signal });

try {
  for await (const msg of poller.messages()) {
    if (msg.type === "text") {
      console.log(`${msg.fromUserId}: ${msg.content}`);
    }
    // ...
  }
} catch (err) {
  // Network errors, API errors, etc.
  console.error("Poller error:", err);
}

// Stop polling
controller.abort();
```

### WeixinAccount

```typescript
interface WeixinAccount {
  accountId: string;    // Bot account ID (ilink_bot_id)
  token?: string;       // Bot token from QR login
  baseUrl: string;      // API base URL
  cdnBaseUrl: string;   // CDN URL for media
  userId?: string;      // WeChat user who logged in
  routeTag?: string;    // Optional: from backend config
  enabled?: boolean;
}
```

### Context Token

Each inbound message has a `contextToken`. You **must** use the same token when sending a reply to that user. Store it per-user:

```typescript
// In your for await loop
for await (const msg of poller.messages()) {
  if (msg.type === "text") {
    // Store: userId -> contextToken
    await db.saveContextToken(msg.fromUserId, msg.contextToken);
  }
}

// Later, when replying:
const token = await db.getContextToken(toUserId);
await sendMessageWeixin({
  to: toUserId,
  text: "Hello!",
  opts: { contextToken: token, ... },
});
```

### Status Changes

Connection status is reported via callback:

```typescript
const poller = createPoller({
  account,
  syncBuf,
  onStatusChange: (status) => {
    if (status.connected) {
      console.log("Connected");
    } else {
      console.log(`Disconnected: ${status.error}`);
    }
  },
  abortSignal: controller.signal,
});
```
