export interface TypingCallbacks {
  start(): Promise<void>;
  stop(): Promise<void>;
  startError(err: unknown): void;
  stopError(err: unknown): void;
}

export interface CreateTypingCallbacksOptions {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  onStartError?: (err: unknown) => void;
  onStopError?: (err: unknown) => void;
  keepaliveIntervalMs?: number;
}

/**
 * Create typing indicator callbacks with keepalive support.
 */
export function createTypingCallbacks(options: CreateTypingCallbacksOptions): TypingCallbacks {
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  const keepaliveIntervalMs = options.keepaliveIntervalMs ?? 5000;

  return {
    async start() {
      try {
        await options.start();
        if (keepaliveIntervalMs > 0) {
          keepaliveTimer = setInterval(async () => {
            try {
              await options.start();
            } catch (err) {
              options.onStartError?.(err);
            }
          }, keepaliveIntervalMs);
        }
      } catch (err) {
        options.onStartError?.(err);
      }
    },
    async stop() {
      if (keepaliveTimer) {
        clearInterval(keepaliveTimer);
        keepaliveTimer = null;
      }
      try {
        await options.stop();
      } catch (err) {
        options.onStopError?.(err);
      }
    },
    startError(err: unknown) {
      options.onStartError?.(err);
    },
    stopError(err: unknown) {
      options.onStopError?.(err);
    },
  };
}
