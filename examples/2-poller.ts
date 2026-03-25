/**
 * Example 2: Message Polling with Async Iterable
 *
 * Demonstrates the async iterable interface for receiving messages.
 */
import { createPoller, type InboundMessage, type TextMessage, type MediaMessage } from "../src/index.js";

interface Credentials {
  accountId: string;
  token: string;
  baseUrl: string;
  cdnBaseUrl: string;
  userId?: string;
  routeTag?: string;
}

// In production, load from your own storage
const credentials: Credentials = {
  accountId: "your-account-id",
  token: "your-bot-token",
  baseUrl: "https://ilinkai.weixin.qq.com",
  cdnBaseUrl: "https://novac2c.cdn.weixin.qq.com/c2c",
  routeTag: undefined,
};

// Caller manages syncBuf persistence
let syncBufValue = "";

// AbortController for stopping
const controller = new AbortController();

// Create the poller
const poller = createPoller({
  account: {
    accountId: credentials.accountId,
    token: credentials.token,
    baseUrl: credentials.baseUrl,
    cdnBaseUrl: credentials.cdnBaseUrl,
    userId: credentials.userId,
    routeTag: credentials.routeTag,
  },

  // Caller manages sync buf - it survives restarts if you persist it
  syncBuf: {
    value: syncBufValue,
  },

  // Callback when sync buf changes (for persistence)
  onSyncBufUpdate: (buf) => {
    syncBufValue = buf;
    // In production: save to file/database
    console.log(`[SyncBuf] Updated, length=${buf.length}`);
  },

  // Connection status callback
  onStatusChange: (status) => {
    if (status.connected) {
      console.log("[Status] Connected");
    } else {
      console.log(`[Status] Disconnected: ${status.error}`);
    }
  },

  // Abort signal for stopping
  abortSignal: controller.signal,
});

// Message handler using for await...of
(async () => {
  console.log("Poller started. Waiting for messages...");
  console.log("Press Ctrl+C to stop.\n");

  try {
    for await (const msg of poller.messages()) {
      if (msg.type === "text") {
        handleText(msg as TextMessage);
      } else {
        handleMedia(msg as MediaMessage);
      }
    }
  } catch (err) {
    // Network errors, API errors, etc.
    console.error(`[Error] Poller error: ${err}`);
  }

  console.log("[Poller] Stream ended");
})();

function handleText(msg: TextMessage) {
  console.log(`\n[Text] From: ${msg.fromUserId}`);
  console.log(`[Text] Content: ${msg.content}`);
  console.log(`[Text] ContextToken: ${msg.contextToken}`);
  console.log(`[Text] Timestamp: ${msg.timestamp}`);

  // IMPORTANT: Save the contextToken for replying
  // In production: store in your own storage keyed by userId
}

function handleMedia(msg: MediaMessage) {
  console.log(`\n[Media] From: ${msg.fromUserId}`);
  console.log(`[Media] Type: ${msg.type}`);
  console.log(`[Media] Path: ${msg.mediaPath}`);
  console.log(`[Media] MediaType: ${msg.mediaType}`);
  console.log(`[Media] ContextToken: ${msg.contextToken}`);
}

// Handle shutdown gracefully
process.on("SIGINT", () => {
  console.log("\nStopping poller...");
  controller.abort();
  process.exit(0);
});
