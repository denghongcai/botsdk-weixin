/**
 * Example 1: QR Code Login
 *
 * Demonstrates how to authenticate with WeChat using QR code scanning.
 * Run this script to get a QR code, then scan with WeChat app.
 */
import { loginWithQr, waitForLogin, DEFAULT_BASE_URL } from "../src/index.js";

async function main() {
  const apiBaseUrl = DEFAULT_BASE_URL;
  const routeTag = undefined; // Optional: set if your backend requires it

  console.log("Starting QR login...\n");

  // Step 1: Initiate QR code login
  const loginResult = await loginWithQr({
    apiBaseUrl,
    routeTag,
    verbose: true,
  });

  console.log(`Session key: ${loginResult.sessionKey}`);
  console.log(`QR Code URL: ${loginResult.qrcodeUrl}\n`);

  // Step 2: Wait for user to scan and confirm
  const waitResult = await waitForLogin({
    sessionKey: loginResult.sessionKey,
    apiBaseUrl,
    routeTag,
    verbose: true,
    timeoutMs: 5 * 60 * 1000, // 5 minutes
  });

  if (waitResult.connected) {
    console.log("\n✅ Login successful!");
    console.log(`Account ID: ${waitResult.accountId}`);
    console.log(`User ID: ${waitResult.userId}`);
    console.log(`Base URL: ${waitResult.baseUrl}`);
    console.log(`Bot Token: ${waitResult.botToken}`);

    // Save these values - caller manages persistence
    const credentials = {
      accountId: waitResult.accountId!,
      token: waitResult.botToken!,
      baseUrl: waitResult.baseUrl!,
      cdnBaseUrl: "https://novac2c.cdn.weixin.qq.com/c2c",
      userId: waitResult.userId,
    };

    console.log("\nCredentials to persist:");
    console.log(JSON.stringify(credentials, null, 2));
  } else {
    console.log(`\n❌ Login failed: ${waitResult.message}`);
  }
}

main().catch(console.error);
