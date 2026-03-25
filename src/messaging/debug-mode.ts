/**
 * Per-bot debug mode toggle (in-memory only).
 *
 * State is NOT persisted - the caller manages persistence if needed.
 * This is intentional: the library has no file I/O.
 */

const debugModeAccounts = new Set<string>();

/** Toggle debug mode for a bot account. Returns the new state. */
export function toggleDebugMode(accountId: string): boolean {
  if (debugModeAccounts.has(accountId)) {
    debugModeAccounts.delete(accountId);
    return false;
  }
  debugModeAccounts.add(accountId);
  return true;
}

/** Check whether debug mode is active for a bot account. */
export function isDebugMode(accountId: string): boolean {
  return debugModeAccounts.has(accountId);
}

/**
 * Reset internal state — only for tests.
 * @internal
 */
export function _resetForTest(): void {
  debugModeAccounts.clear();
}
