import path from "node:path";
import os from "node:os";

/**
 * Resolve the preferred temp directory for openbot.
 * Uses TMPDIR/TEMP/TMP env vars, falls back to os.tmpdir().
 */
export function resolvePreferredOpenClawTmpDir(): string {
  return (
    process.env.TMPDIR?.trim() ||
    process.env.TEMP?.trim() ||
    process.env.TMP?.trim() ||
    path.join(os.tmpdir(), "openbot")
  );
}
