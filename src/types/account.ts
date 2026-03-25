/**
 * Core imperative account types for botsdk-weixin.
 * All state is passed explicitly by the caller - no internal file I/O.
 */

/** Account object passed directly by the caller. No file operations inside the library. */
export interface WeixinAccount {
  accountId: string;
  token?: string;
  baseUrl: string;
  cdnBaseUrl: string;
  userId?: string;
  routeTag?: string;
  enabled?: boolean;
}

/** Sync buffer state for getUpdates long-poll. Caller manages persistence. */
export interface SyncBuf {
  value: string;
}
