/**
 * openbot-weixin - Pure WeChat API client library
 *
 * A standalone WeChat channel implementation without OpenClaw framework dependencies.
 */

// API client
export { getUpdates, sendMessage, getUploadUrl, sendTyping, getConfig } from "./src/api/api.js";
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
} from "./src/api/types.js";

// Auth
export {
  loginWithQr,
  waitForLogin,
  fetchQRCode,
  pollQRStatus,
} from "./src/auth/login-qr.js";
export {
  resolveWeixinAccount,
  loadWeixinAccount,
  saveWeixinAccount,
  listWeixinAccountIds,
  registerWeixinAccountId,
  listIndexedWeixinAccountIds,
  DEFAULT_BASE_URL,
  CDN_BASE_URL,
} from "./src/auth/accounts.js";
export { readFrameworkAllowFromList, registerUserInFrameworkStore } from "./src/auth/pairing.js";

// Messaging
export { markdownToPlainText, sendMessageWeixin, sendImageMessageWeixin, sendVideoMessageWeixin, sendFileMessageWeixin } from "./src/messaging/send.js";
export { handleSlashCommand } from "./src/messaging/slash-commands.js";
export { sendWeixinErrorNotice } from "./src/messaging/error-notice.js";
export { weixinMessageToMsgContext, setContextToken, getContextToken, getContextTokenFromMsgContext, isMediaItem } from "./src/messaging/inbound.js";

// Monitor / Polling
export { createPoller } from "./src/monitor/poller.js";

// Config
export { WeixinConfigSchema } from "./src/config/config-schema.js";
export type { WeixinConfig } from "./src/types/index.js";

// Public types
export type {
  ResolvedWeixinAccount,
  InboundMessage,
  TextMessage,
  MediaMessage,
  AccountStatus,
  WeixinAccountConfig,
  WeixinAccountData,
} from "./src/types/index.js";
export type { WeixinMessageCallbacks } from "./src/types/callbacks.js";

// SDK utilities (for internal use, but exported for advanced users)
export { normalizeAccountId } from "./src/sdk/normalize-account-id.js";
export { stripMarkdown } from "./src/sdk/strip-markdown.js";
export { resolvePreferredOpenClawTmpDir } from "./src/sdk/tmp-dir.js";
export { createTypingCallbacks } from "./src/sdk/typing-callbacks.js";
export { withFileLock } from "./src/sdk/file-lock.js";
