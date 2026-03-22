/**
 * Weixin long-poll poller
 *
 * Provides a simple polling interface that calls message callbacks.
 * This replaces the OpenClaw-integrated monitor.ts
 */
import { getUpdates } from "../api/api.js";
import { SESSION_EXPIRED_ERRCODE, pauseSession, getRemainingPauseMs } from "../api/session-guard.js";
import type { ResolvedWeixinAccount, InboundMessage } from "../types/index.js";
import type { WeixinMessageCallbacks } from "../types/callbacks.js";
import { processInboundMessage } from "../messaging/processor.js";
import { logger } from "../util/logger.js";

const DEFAULT_LONG_POLL_TIMEOUT_MS = 35_000;
const MAX_CONSECUTIVE_FAILURES = 3;
const BACKOFF_DELAY_MS = 30_000;
const RETRY_DELAY_MS = 2_000;

export interface PollerOptions {
  /** Resolved account with credentials */
  account: ResolvedWeixinAccount;
  /** Message callbacks implemented by the consumer */
  callbacks: WeixinMessageCallbacks;
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

interface SyncBuf {
  value: string;
  save: (buf: string) => void;
}

/**
 * Create a Weixin message poller
 *
 * @example
 * const poller = createPoller({
 *   account: resolvedAccount,
 *   callbacks: {
 *     onTextMessage: async (msg) => {
 *       console.log('Received:', msg.content);
 *       // Reply using callbacks.sendText if needed
 *     },
 *     onMediaMessage: async (msg) => {
 *       console.log('Media:', msg.mediaPath);
 *     },
 *   },
 * });
 *
 * // Later: poller.stop()
 */
export function createPoller(opts: PollerOptions): { stop: () => void } {
  const {
    account,
    callbacks,
    onStatusChange,
    log = () => {},
    errLog = (m) => console.error(m),
    abortSignal,
    longPollTimeoutMs = DEFAULT_LONG_POLL_TIMEOUT_MS,
  } = opts;

  const accountLog = logger.withAccount(account.accountId);
  let getUpdatesBuf = "";
  let nextTimeoutMs = longPollTimeoutMs;
  let consecutiveFailures = 0;
  let stopped = false;

  function stop() {
    stopped = true;
    accountLog.info("Poller stopped");
  }

  async function run() {
    while (!stopped && !abortSignal?.aborted) {
      try {
        const resp = await getUpdates({
          baseUrl: account.baseUrl,
          token: account.token,
          get_updates_buf: getUpdatesBuf,
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

        // Update sync buf
        if (resp.get_updates_buf != null && resp.get_updates_buf !== "") {
          getUpdatesBuf = resp.get_updates_buf;
        }

        // Update next poll timeout
        if (resp.longpolling_timeout_ms != null && resp.longpolling_timeout_ms > 0) {
          nextTimeoutMs = resp.longpolling_timeout_ms;
        }

        // Process messages
        const list = resp.msgs ?? [];
        for (const msg of list) {
          accountLog.info(
            `inbound: from=${msg.from_user_id} types=${msg.item_list?.map((i) => i.type).join(",") ?? "none"}`,
          );

          try {
            await processInboundMessage(msg, account, callbacks, {
              accountId: account.accountId,
              baseUrl: account.baseUrl,
              cdnBaseUrl: account.cdnBaseUrl,
              token: account.token,
              log: accountLog.info.bind(accountLog),
              errLog: accountLog.error.bind(accountLog),
            });
          } catch (err) {
            callbacks.onError?.(err as Error, "processInboundMessage");
            errLog(`Error processing message: ${String(err)}`);
          }
        }
      } catch (err) {
        if (abortSignal?.aborted) {
          accountLog.info("Poller aborted");
          return;
        }
        consecutiveFailures++;
        errLog(`getUpdates error (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}): ${String(err)}`);
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          consecutiveFailures = 0;
          await sleep(BACKOFF_DELAY_MS, abortSignal);
        } else {
          await sleep(2000, abortSignal);
        }
      }
    }
    accountLog.info("Poller ended");
  }

  // Start polling
  run().catch((err) => {
    callbacks.onError?.(err, "poller");
  });

  return { stop };
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
