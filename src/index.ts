/**
 * botsdk-weixin - Pure WeChat API client library
 *
 * A standalone WeChat channel implementation without OpenClaw framework dependencies.
 * All state is managed imperatively by the caller - no internal file I/O.
 */

// API client
export { getUpdates, sendMessage, getUploadUrl, sendTyping, getConfig } from "./api/api.js";
export type {
  GetUpdatesResp,
  SendMessageReq,
  SendMessageResp,
  GetUploadUrlResp,
  SendTypingReq,
  SendTypingResp,
  GetConfigResp,
  WeixinMessage,
  MessageItem,
} from "./api/types.js";

// Auth
export {
  startWeixinLoginWithQr as loginWithQr,
  waitForWeixinLogin as waitForLogin,
} from "./auth/login-qr.js";
export { DEFAULT_BASE_URL, CDN_BASE_URL } from "./config/constants.js";

// Messaging
export { markdownToPlainText, sendMessageWeixin, sendImageMessageWeixin, sendVideoMessageWeixin, sendFileMessageWeixin } from "./messaging/send.js";
export { sendWeixinErrorNotice } from "./messaging/error-notice.js";

// Monitor / Polling
export { createPoller } from "./monitor/poller.js";

// Config
export { WeixinConfigSchema } from "./config/config-schema.js";
export type { WeixinConfig } from "./types/index.js";

// Public types
export type {
  InboundMessage,
  TextMessage,
  MediaMessage,
  AccountStatus,
  WeixinAccountConfig,
  WeixinAccountData,
} from "./types/index.js";
export type { WeixinAccount, SyncBuf } from "./types/account.js";

// SDK utilities (for internal use, but exported for advanced users)
export { normalizeAccountId } from "./sdk/normalize-account-id.js";
export { stripMarkdown } from "./sdk/strip-markdown.js";
export { resolvePreferredOpenClawTmpDir } from "./sdk/tmp-dir.js";
export { createTypingCallbacks } from "./sdk/typing-callbacks.js";
export { withFileLock } from "./sdk/file-lock.js";
