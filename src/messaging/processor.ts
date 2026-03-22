/**
 * Inbound message processor
 *
 * Processes Weixin messages and calls the appropriate callbacks.
 * This replaces the OpenClaw-integrated process-message.ts
 */
import path from "node:path";

import type { WeixinMessage } from "../api/types.js";
import { MessageItemType } from "../api/types.js";
import type { ResolvedWeixinAccount, TextMessage, MediaMessage } from "../types/index.js";
import type { WeixinMessageCallbacks } from "../types/callbacks.js";
import { downloadMediaFromItem } from "../media/media-download.js";
import { handleSlashCommand } from "./slash-commands.js";
import { weixinMessageToMsgContext, type WeixinInboundMediaOpts } from "./inbound.js";
import { setContextToken } from "./inbound.js";
import { resolvePreferredOpenClawTmpDir } from "../sdk/tmp-dir.js";
import { logger } from "../util/logger.js";

const MEDIA_OUTBOUND_TEMP_DIR = path.join(resolvePreferredOpenClawTmpDir(), "weixin/media/outbound-temp");

interface ProcessorDeps {
  accountId: string;
  baseUrl: string;
  cdnBaseUrl: string;
  token?: string;
  log: (msg: string) => void;
  errLog: (msg: string) => void;
}

/**
 * Extract text body from item_list
 */
function extractTextBody(itemList?: { type?: number; text_item?: { text?: string } }[]): string {
  if (!itemList?.length) return "";
  for (const item of itemList) {
    if (item.type === MessageItemType.TEXT && item.text_item?.text != null) {
      return String(item.text_item.text);
    }
  }
  return "";
}

/**
 * Process a single inbound Weixin message
 */
export async function processInboundMessage(
  msg: WeixinMessage,
  account: ResolvedWeixinAccount,
  callbacks: WeixinMessageCallbacks,
  deps: ProcessorDeps,
): Promise<void> {
  const receivedAt = Date.now();
  const { log, errLog } = deps;

  const textBody = extractTextBody(msg.item_list);

  // Handle slash commands first
  if (textBody.startsWith("/") && callbacks.sendText) {
    const slashResult = await handleSlashCommand(textBody, {
      to: msg.from_user_id ?? "",
      contextToken: msg.context_token,
      baseUrl: account.baseUrl,
      token: account.token,
      accountId: account.accountId,
      log,
      errLog,
    }, receivedAt, msg.create_time_ms);

    if (slashResult.handled) {
      log("Slash command handled");
      return;
    }
  }

  // Find the first downloadable media item
  const mainMediaItem =
    msg.item_list?.find(
      (i) => i.type === MessageItemType.IMAGE && i.image_item?.media?.encrypt_query_param,
    ) ??
    msg.item_list?.find(
      (i) => i.type === MessageItemType.VIDEO && i.video_item?.media?.encrypt_query_param,
    ) ??
    msg.item_list?.find(
      (i) => i.type === MessageItemType.FILE && i.file_item?.media?.encrypt_query_param,
    ) ??
    msg.item_list?.find(
      (i) =>
        i.type === MessageItemType.VOICE &&
        i.voice_item?.media?.encrypt_query_param &&
        !i.voice_item.text,
    );

  const refMediaItem = !mainMediaItem
    ? msg.item_list?.find(
        (i) =>
          i.type === MessageItemType.TEXT &&
          i.ref_msg?.message_item &&
          isMediaItem(i.ref_msg.message_item!),
      )?.ref_msg?.message_item
    : undefined;

  // Download media if present
  const mediaOpts: WeixinInboundMediaOpts = {};
  let mediaDownloaded = false;

  const mediaItem = mainMediaItem ?? refMediaItem;
  if (mediaItem) {
    try {
      const downloaded = await downloadMediaFromItem(mediaItem, {
        cdnBaseUrl: account.cdnBaseUrl,
        saveMedia: async (buf, mime) => {
          // Simple file save - in production would use proper temp file handling
          const tmpDir = MEDIA_OUTBOUND_TEMP_DIR;
          const fs = await import("node:fs");
          fs.mkdirSync(tmpDir, { recursive: true });
          const ext = mime?.split("/")[1] ?? "bin";
          const filePath = path.join(tmpDir, `media-${Date.now()}.${ext}`);
          fs.writeFileSync(filePath, buf);
          return filePath;
        },
        log,
        errLog,
        label: refMediaItem ? "ref" : "inbound",
      });
      Object.assign(mediaOpts, downloaded);
      mediaDownloaded = true;
    } catch (err) {
      errLog(`Media download failed: ${String(err)}`);
    }
  }

  // Cache context token
  if (msg.context_token && msg.from_user_id) {
    setContextToken(account.accountId, msg.from_user_id, msg.context_token);
  }

  // Build message ID
  const messageId = msg.message_id?.toString() ?? `msg-${Date.now()}`;

  // Build the context for callbacks
  const ctx = weixinMessageToMsgContext(msg, account.accountId, mediaOpts);

  if (mediaItem && (mediaOpts.decryptedPicPath || mediaOpts.decryptedVideoPath || mediaOpts.decryptedFilePath || mediaOpts.decryptedVoicePath)) {
    // It's a media message
    const mediaPath =
      mediaOpts.decryptedPicPath ||
      mediaOpts.decryptedVideoPath ||
      mediaOpts.decryptedFilePath ||
      mediaOpts.decryptedVoicePath ||
      "";

    const mediaType = getMediaMimeType(mediaItem.type, mediaOpts);

    const mediaMsg: MediaMessage = {
      type: getMediaType(mediaItem.type),
      fromUserId: msg.from_user_id ?? "",
      toUserId: msg.to_user_id ?? "",
      mediaPath,
      mediaType,
      messageId,
      contextToken: msg.context_token,
      timestamp: msg.create_time_ms,
    };

    await callbacks.onMediaMessage?.(mediaMsg);
  } else {
    // It's a text message
    const textMsg: TextMessage = {
      type: "text",
      fromUserId: msg.from_user_id ?? "",
      toUserId: msg.to_user_id ?? "",
      content: ctx.Body ?? textBody,
      messageId,
      contextToken: msg.context_token,
      timestamp: msg.create_time_ms,
    };

    await callbacks.onTextMessage?.(textMsg);
  }
}

function isMediaItem(item: { type?: number }): boolean {
  return (
    item.type === MessageItemType.IMAGE ||
    item.type === MessageItemType.VIDEO ||
    item.type === MessageItemType.FILE ||
    item.type === MessageItemType.VOICE
  );
}

function getMediaType(type?: number): "image" | "video" | "voice" | "file" {
  switch (type) {
    case MessageItemType.IMAGE:
      return "image";
    case MessageItemType.VIDEO:
      return "video";
    case MessageItemType.VOICE:
      return "voice";
    case MessageItemType.FILE:
      return "file";
    default:
      return "file";
  }
}

function getMediaMimeType(itemType?: number, opts?: WeixinInboundMediaOpts): string {
  if (opts?.voiceMediaType) return opts.voiceMediaType;
  if (opts?.fileMediaType) return opts.fileMediaType;

  switch (itemType) {
    case MessageItemType.IMAGE:
      return "image/*";
    case MessageItemType.VIDEO:
      return "video/mp4";
    case MessageItemType.VOICE:
      return "audio/wav";
    default:
      return "application/octet-stream";
  }
}
