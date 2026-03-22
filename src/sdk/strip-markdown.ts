/**
 * Strip basic markdown syntax from text.
 * Used for converting model markdown output to plain text for Weixin.
 */
export function stripMarkdown(text: string): string {
  let result = text;
  // Bold/italic
  result = result.replace(/\*\*([^*]+)\*\*/g, "$1");
  result = result.replace(/\*([^*]+)\*/g, "$1");
  result = result.replace(/__([^_]+)__/g, "$1");
  result = result.replace(/_([^_]+)_/g, "$1");
  // Inline code
  result = result.replace(/`([^`]+)`/g, "$1");
  // Headers
  result = result.replace(/^#{1,6}\s+/gm, "");
  // Blockquotes
  result = result.replace(/^>\s+/gm, "");
  // Horizontal rules
  result = result.replace(/^[-*_]{3,}$/gm, "");
  // List markers
  result = result.replace(/^[\s]*[-*+]\s+/gm, "");
  result = result.replace(/^[\s]*\d+\.\s+/gm, "");
  return result;
}
