/**
 * Pairing utilities for Weixin accounts.
 *
 * Note: File-based pairing (allowFrom list) is no longer managed by this library.
 * The caller manages pairing state imperatively.
 */

/**
 * Sanitize a channel/account key for safe use in filenames.
 */
export function safeKey(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) throw new Error("invalid key for allowFrom path");
  const safe = trimmed.replace(/[\\/:*?"<>|]/g, "_").replace(/\.\./g, "_");
  if (!safe || safe === "_") throw new Error("invalid key for allowFrom path");
  return safe;
}
