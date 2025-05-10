// src/client/index.ts
import { SecureMessagingClient } from "./messagingClient";

// Start the client when running this file directly
if (require.main === module) {
  const client = new SecureMessagingClient();
  client.start().catch((error) => {
    console.error("Failed to start client:", error);
    process.exit(1);
  });
}

export { SecureMessagingClient };
