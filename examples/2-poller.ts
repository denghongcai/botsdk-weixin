/**
 * Example 2: Message Polling
 *
 * Demonstrates how to poll for incoming messages using callbacks.
 * The caller manages syncBuf persistence - this example shows the pattern.
 */
import { createPoller, type TextMessage, type MediaMessage } from "../src/index.js";

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

// Step 1: Create the poller
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

  // Message callbacks
  callbacks: {
    onTextMessage: async (msg: TextMessage) => {
      console.log(`\n[Text] From: ${msg.fromUserId}`);
      console.log(`[Text] Content: ${msg.content}`);
      console.log(`[Text] ContextToken: ${msg.contextToken}`);

      // IMPORTANT: Save the contextToken for replying
      // In production: store in your own storage keyed by userId
    },

    onMediaMessage: async (msg: MediaMessage) => {
      console.log(`\n[Media] From: ${msg.fromUserId}`);
      console.log(`[Media] Type: ${msg.mediaType}`);
      console.log(`[Media] Path: ${msg.mediaPath}`);
      console.log(`[Media] ContextToken: ${msg.contextToken}`);
    },

    onError: (err, context) => {
      console.error(`[Error] ${context}: ${err.message}`);
    },
  },

  // Custom timeouts
  longPollTimeoutMs: 35_000,
});

console.log("Poller started. Waiting for messages...");
console.log("Press Ctrl+C to stop.\n");

// Handle shutdown gracefully
process.on("SIGINT", () => {
  console.log("\nStopping poller...");
  poller.stop();
  process.exit(0);
});
