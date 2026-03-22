/**
 * Normalize a Weixin account ID to a filesystem-safe form.
 * Replaces @ and . separators with dashes.
 * e.g. "hex@im.bot" -> "hex-im-bot"
 */
export function normalizeAccountId(raw: string): string {
  return raw.replace(/@/g, "-").replace(/\./g, "-");
}
