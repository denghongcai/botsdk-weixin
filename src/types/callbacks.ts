/**
 * Message callbacks for the poller - implemented by the consumer
 */
import type { TextMessage, MediaMessage } from "./index.js";

export interface WeixinMessageCallbacks {
  /**
   * Called when a text message is received
   */
  onTextMessage?(msg: TextMessage): void | Promise<void>;

  /**
   * Called when a media message is received (image, video, voice, file)
   */
  onMediaMessage?(msg: MediaMessage): void | Promise<void>;

  /**
   * Called when an error occurs during message processing
   */
  onError?(err: Error, context?: string): void;

  /**
   * Optional: called to send a text reply
   * The callback should handle the actual sending logic
   */
  sendText?(params: { to: string; text: string; contextToken?: string }): Promise<void>;

  /**
   * Optional: called to send a media reply
   */
  sendMedia?(params: {
    to: string;
    text?: string;
    mediaPath: string;
    mediaType: string;
    contextToken?: string;
  }): Promise<void>;
}
