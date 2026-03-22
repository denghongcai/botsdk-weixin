import fs from "node:fs";

const LOCK_EXTENSION = ".lock";

interface FileLockOptions {
  retries?: { retries: number; factor: number; minTimeout: number; maxTimeout: number };
  stale?: number;
}

/**
 * Acquire an exclusive file lock using a simple dotfile approach.
 * Returns a release function when lock is acquired.
 */
export async function withFileLock<T>(
  filePath: string,
  options: FileLockOptions,
  fn: () => Promise<T>,
): Promise<T> {
  const lockPath = filePath + LOCK_EXTENSION;
  const retries = options.retries ?? { retries: 3, factor: 2, minTimeout: 100, maxTimeout: 2000 };
  let delay = retries.minTimeout;

  for (let attempt = 0; attempt <= retries.retries; attempt++) {
    try {
      // Try to create lock file exclusively
      fs.writeFileSync(lockPath, String(process.pid), { flag: "wx" });
      break;
    } catch (err: unknown) {
      if (attempt === retries.retries) {
        throw new Error(`Failed to acquire lock on ${filePath}: ${String(err)}`);
      }
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * retries.factor, retries.maxTimeout);
    }
  }

  try {
    return await fn();
  } finally {
    // Release lock
    try {
      fs.unlinkSync(lockPath);
    } catch {
      // ignore
    }
  }
}
