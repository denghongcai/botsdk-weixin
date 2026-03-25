/**
 * Public API types for openbot-weixin
 */

/** Account resolved from config + stored credentials */
export interface ResolvedWeixinAccount {
  accountId: string;
  baseUrl: string;
  cdnBaseUrl: string;
  token?: string;
  enabled: boolean;
  /** true when a token has been obtained via QR login */
  configured: boolean;
  name?: string;
}

/** Unified inbound message - either text or media */
export type InboundMessage = TextMessage | MediaMessage;

/** Text message inbound */
export interface TextMessage {
  type: "text";
  fromUserId: string;
  toUserId: string;
  content: string;
  messageId: string;
  contextToken?: string;
  timestamp?: number;
}

/** Media message inbound */
export interface MediaMessage {
  type: "image" | "video" | "voice" | "file";
  fromUserId: string;
  toUserId: string;
  mediaPath: string;
  mediaType: string;
  messageId: string;
  contextToken?: string;
  timestamp?: number;
}

/** Account connection status */
export interface AccountStatus {
  state: "connected" | "disconnected" | "error";
  lastEventAt?: number;
  lastInboundAt?: number;
  error?: string;
}

/** Configuration for a Weixin account */
export interface WeixinAccountConfig {
  name?: string;
  enabled?: boolean;
  cdnBaseUrl?: string;
  routeTag?: number | string;
}

/** Root config section for Weixin channel */
export interface WeixinConfig {
  channels?: {
    "openbot-weixin"?: WeixinAccountConfig;
    "openclaw-weixin"?: WeixinAccountConfig;
  };
}

/** Credentials stored for an account */
export interface WeixinAccountData {
  token?: string;
  savedAt?: string;
  baseUrl?: string;
  userId?: string;
}
