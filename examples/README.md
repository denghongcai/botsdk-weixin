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

// 2. Poll for messages
const syncBuf = { value: "" };
const poller = createPoller({
  account,
  syncBuf,
  onSyncBufUpdate: (buf) => { syncBuf.value = buf; /* persist */ },
  callbacks: {
    onTextMessage: async (msg) => {
      console.log(`${msg.fromUserId}: ${msg.content}`);
      // Save contextToken and use it to reply
    },
  },
});

// 3. Stop
poller.stop();
```

## Examples

| File | Description |
|------|-------------|
| [1-login.ts](./1-login.ts) | QR code login flow |
| [2-poller.ts](./2-poller.ts) | Long-poll message loop with callbacks |
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

### Imperative API

All state is managed by you, not the library:

- **Credentials**: You construct `WeixinAccount` objects and manage persistence
- **Sync Buf**: Passed to poller, updated via callback, you decide where to store
- **Context Tokens**: Returned from inbound messages, you store and retrieve for replies

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
// In your message handler
callbacks.onTextMessage = async (msg) => {
  // Store: userId -> contextToken
  await db.saveContextToken(msg.fromUserId, msg.contextToken);

  // Later, when replying:
  const token = await db.getContextToken(msg.fromUserId);
  await sendMessageWeixin({
    to: msg.fromUserId,
    text: "Hello!",
    opts: { contextToken: token, ... },
  });
};
```
