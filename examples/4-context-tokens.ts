/**
 * Example 4: Context Token Management
 *
 * Demonstrates how to manage context tokens imperatively.
 *
 * IMPORTANT: contextToken is REQUIRED for sending replies. It must be
 * obtained from inbound messages and passed when sending replies.
 *
 * The library does NOT store context tokens internally - the caller
 * manages them completely.
 */

// This example shows the complete flow of how context tokens should be managed
// in a real application.

interface ContextTokenStore {
  [userId: string]: string;
}

class MyContextTokenManager {
  // In production, persist this to your database/storage
  private tokens: ContextTokenStore = {};

  /**
   * Save context token from an inbound message
   */
  save(userId: string, contextToken: string): void {
    this.tokens[userId] = contextToken;
    console.log(`[TokenStore] Saved token for user ${userId}`);
    // In production: persist to database
  }

  /**
   * Get context token for sending a reply to a user
   */
  get(userId: string): string | undefined {
    const token = this.tokens[userId];
    if (!token) {
      console.warn(`[TokenStore] No token found for user ${userId}`);
    }
    return token;
  }

  /**
   * Remove token when conversation ends
   */
  remove(userId: string): void {
    delete this.tokens[userId];
    console.log(`[TokenStore] Removed token for user ${userId}`);
  }

  /**
   * List all users with active tokens
   */
  activeUsers(): string[] {
    return Object.keys(this.tokens);
  }
}

// Example usage in a poller setup:

async function example() {
  const tokenManager = new MyContextTokenManager();

  // Simulating inbound messages
  function onInboundMessage(userId: string, content: string, contextToken?: string) {
    console.log(`\n[Inbound] From: ${userId}, Content: ${content}`);

    if (contextToken) {
      // Step 1: Save the context token
      tokenManager.save(userId, contextToken);
    }

    // Step 2: Process the message...
    // const reply = await myAI.process(userId, content);

    // Step 3: Get the token and send reply (when using poller callbacks)
    // const token = tokenManager.get(userId);
    // if (token) {
    //   await sendMessageWeixin({
    //     to: userId,
    //     text: reply,
    //     opts: { contextToken: token, ... },
    //   });
    // }
  }

  // Simulate receiving messages
  onInboundMessage("user-123", "Hello bot!", "ctx-token-abc");
  onInboundMessage("user-456", "Hi there!", "ctx-token-def");

  console.log(`\n[TokenStore] Active users: ${tokenManager.activeUsers().join(", ")}`);

  // Get token for sending reply
  const token = tokenManager.get("user-123");
  console.log(`[TokenStore] Token for user-123: ${token}`);
}

example();
