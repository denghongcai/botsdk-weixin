/**
 * Weixin long-poll poller
 *
 * Provides an async iterable interface for receiving messages.
 * All state (sync buf) is managed imperatively by the caller.
 *
 * @example
 * const controller = new AbortController();
 * const poller = createPoller({
 *   account,
 *   syncBuf,
 *   onSyncBufUpdate: (buf) => { syncBuf.value = buf; },
 *   onStatusChange: (s) => console.log("Status:", s),
 *   abortSignal: controller.signal,
 * });
 *
 * (async () => {
 *   try {
 *     for await (const msg of poller.messages()) {
 *       if (msg.type === "text") {
 *         console.log(`${msg.fromUserId}: ${msg.content}`);
 *       }
 *     }
 *   } catch (err) {
 *     console.error("Poller error:", err);
 *   }
 * })();
 *
 * // Stop: controller.abort()
 */
import { getUpdates } from "../api/api.js";
import { SESSION_EXPIRED_ERRCODE, pauseSession, getRemainingPauseMs } from "../api/session-guard.js";
import type { WeixinAccount, SyncBuf } from "../types/account.js";
import type { InboundMessage } from "../types/index.js";
import { processInboundMessage } from "../messaging/processor.js";
import { logger } from "../util/logger.js";

const DEFAULT_LONG_POLL_TIMEOUT_MS = 35_000;
const MAX_CONSECUTIVE_FAILURES = 3;
const BACKOFF_DELAY_MS = 30_000;
const RETRY_DELAY_MS = 2_000;

export interface PollerOptions {
  /** Account object with credentials. Caller manages persistence. */
  account: WeixinAccount;
  /** Sync buf state managed by caller. Updated via onSyncBufUpdate callback. */
  syncBuf: SyncBuf;
  /** Called when sync buf changes so caller can persist it */
  onSyncBufUpdate?: (buf: string) => void;
  /** Called on connection status changes */
  onStatusChange?: (status: { connected: boolean; error?: string }) => void;
  /** Custom log function */
  log?: (msg: string) => void;
  /** Custom error log function */
  errLog?: (msg: string) => void;
  /** Abort signal to stop polling */
  abortSignal?: AbortSignal;
  /** Custom long-poll timeout in ms */
  longPollTimeoutMs?: number;
}

export interface Poller {
  /** Async iterable stream of inbound messages */
  messages(): AsyncGenerator<InboundMessage>;
}

/**
 * Create a Weixin message poller
 */
export function createPoller(opts: PollerOptions): Poller {
  const {
    account,
    syncBuf,
    onSyncBufUpdate,
    onStatusChange,
    log = () => {},
    errLog = (m) => console.error(m),
    abortSignal,
    longPollTimeoutMs = DEFAULT_LONG_POLL_TIMEOUT_MS,
  } = opts;

  const accountLog = logger.withAccount(account.accountId);

  async function* messages(): AsyncGenerator<InboundMessage> {
    let nextTimeoutMs = longPollTimeoutMs;
    let consecutiveFailures = 0;

    while (!abortSignal?.aborted) {
      try {
        const resp = await getUpdates({
          baseUrl: account.baseUrl,
          token: account.token,
          routeTag: account.routeTag,
          get_updates_buf: syncBuf.value,
          timeoutMs: nextTimeoutMs,
        });

        // Handle session expiration
        if (resp.errcode === SESSION_EXPIRED_ERRCODE || resp.ret === SESSION_EXPIRED_ERRCODE) {
          pauseSession(account.accountId);
          const pauseMs = getRemainingPauseMs(account.accountId);
          errLog(`Session expired, pausing for ${Math.ceil(pauseMs / 60_000)} min`);
          consecutiveFailures = 0;
          await sleep(pauseMs, abortSignal);
          continue;
        }

        // Handle API errors
        if (resp.ret !== undefined && resp.ret !== 0 || resp.errcode !== undefined && resp.errcode !== 0) {
          consecutiveFailures++;
          errLog(`getUpdates failed: ret=${resp.ret} errcode=${resp.errcode}`);
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            consecutiveFailures = 0;
            await sleep(BACKOFF_DELAY_MS, abortSignal);
          } else {
            await sleep(RETRY_DELAY_MS, abortSignal);
          }
          continue;
        }

        consecutiveFailures = 0;
        onStatusChange?.({ connected: true });

        // Update sync buf and notify caller
        if (resp.get_updates_buf != null && resp.get_updates_buf !== "") {
          syncBuf.value = resp.get_updates_buf;
          onSyncBufUpdate?.(resp.get_updates_buf);
        }

        // Update next poll timeout
        if (resp.longpolling_timeout_ms != null && resp.longpolling_timeout_ms > 0) {
          nextTimeoutMs = resp.longpolling_timeout_ms;
        }

        // Process messages and yield
        const list = resp.msgs ?? [];
        for (const msg of list) {
          accountLog.info(
            `inbound: from=${msg.from_user_id} types=${msg.item_list?.map((i) => i.type).join(",") ?? "none"}`,
          );

          try {
            const result = await processInboundMessage(msg, {
              account,
              log: accountLog.info.bind(accountLog),
              errLog: accountLog.error.bind(accountLog),
            });

            // processInboundMessage returns null for handled commands
            if (result) {
              yield result;
            }
          } catch (err) {
            errLog(`Error processing message: ${String(err)}`);
            // Error thrown out of iterator
            throw err;
          }
        }
      } catch (err) {
        if (abortSignal?.aborted) {
          accountLog.info("Poller aborted");
          return;
        }
        // Network errors, etc - throw out of iterator
        throw err;
      }
    }
    accountLog.info("Poller ended");
  }

  return { messages };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new Error("aborted"));
      },
      { once: true },
    );
  });
}
