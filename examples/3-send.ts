/**
 * Example 3: Sending Messages
 *
 * Demonstrates how to send text and media messages.
 * Requires a contextToken from an inbound message.
 */
import {
  sendMessageWeixin,
  sendImageMessageWeixin,
  sendVideoMessageWeixin,
  sendFileMessageWeixin,
  markdownToPlainText,
  DEFAULT_BASE_URL,
} from "../src/index.js";

interface Credentials {
  accountId: string;
  token: string;
  baseUrl: string;
  cdnBaseUrl: string;
  routeTag?: string;
}

// In production, load from your own storage
const credentials: Credentials = {
  accountId: "your-account-id",
  token: "your-bot-token",
  baseUrl: "https://ilinkai.weixin.qq.com",
  cdnBaseUrl: "https://novac2c.cdn.weixin.qq.com/c2c",
  routeTag: undefined,
};

// In production, retrieve from your storage (mapped by userId or from inbound message)
const contextToken = "context-token-from-inbound-message";
const recipientUserId = "recipient-user-id";

async function sendText() {
  console.log("[Send] Sending text message...\n");

  // markdownToPlainText() converts markdown to plain text for WeChat
  const markdownReply = "**Hello** from *botsdk-weixin*!\n\n- Item 1\n- Item 2";
  const plainText = markdownToPlainText(markdownReply);

  const result = await sendMessageWeixin({
    to: recipientUserId,
    text: plainText,
    opts: {
      baseUrl: credentials.baseUrl,
      token: credentials.token,
      routeTag: credentials.routeTag,
      contextToken, // Required! Without it, the API call will fail
    },
  });

  console.log(`[Send] Text sent, messageId: ${result.messageId}`);
}

async function sendImage() {
  console.log("[Send] Sending image message...\n");

  // For images, you need to:
  // 1. Upload the image to CDN first using getUploadUrl
  // 2. Then send using the uploaded file info
  const uploadedFileInfo = {
    filekey: "file-key-from-cdn-upload",
    aeskey: Buffer.from("your-32-byte-aes-key"),
    fileSize: 12345,
    fileSizeCiphertext: 12352,
    downloadEncryptedQueryParam: "encrypted-param-from-upload-response",
  };

  const result = await sendImageMessageWeixin({
    to: recipientUserId,
    text: "Check out this image!",
    uploaded: uploadedFileInfo,
    opts: {
      baseUrl: credentials.baseUrl,
      token: credentials.token,
      routeTag: credentials.routeTag,
      contextToken,
    },
  });

  console.log(`[Send] Image sent, messageId: ${result.messageId}`);
}

async function sendVideo() {
  console.log("[Send] Sending video message...\n");

  const uploadedFileInfo = {
    filekey: "file-key-from-cdn-upload",
    aeskey: Buffer.from("your-32-byte-aes-key"),
    fileSize: 123456,
    fileSizeCiphertext: 123464,
    downloadEncryptedQueryParam: "encrypted-param-from-upload-response",
  };

  const result = await sendVideoMessageWeixin({
    to: recipientUserId,
    text: "Check out this video!",
    uploaded: uploadedFileInfo,
    opts: {
      baseUrl: credentials.baseUrl,
      token: credentials.token,
      routeTag: credentials.routeTag,
      contextToken,
    },
  });

  console.log(`[Send] Video sent, messageId: ${result.messageId}`);
}

async function sendFile() {
  console.log("[Send] Sending file...\n");

  const uploadedFileInfo = {
    filekey: "file-key-from-cdn-upload",
    aeskey: Buffer.from("your-32-byte-aes-key"),
    fileSize: 1234567,
    fileSizeCiphertext: 1234575,
    downloadEncryptedQueryParam: "encrypted-param-from-upload-response",
  };

  const result = await sendFileMessageWeixin({
    to: recipientUserId,
    text: "Here's the file you requested.",
    fileName: "document.pdf",
    uploaded: uploadedFileInfo,
    opts: {
      baseUrl: credentials.baseUrl,
      token: credentials.token,
      routeTag: credentials.routeTag,
      contextToken,
    },
  });

  console.log(`[Send] File sent, messageId: ${result.messageId}`);
}

async function main() {
  try {
    await sendText();
    // await sendImage();
    // await sendVideo();
    // await sendFile();
  } catch (err) {
    console.error(`[Error] ${err}`);
  }
}

main();
