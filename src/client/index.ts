// src/client/index.ts
import { SecureMessagingClient } from "./messagingClient";

// Start the client when this file is run directly (not imported as a module)
if (require.main === module) {
  // Create a new instance of the SecureMessagingClient
  const client = new SecureMessagingClient();

  // Start the client, handling any errors that may occur during startup
  client.start().catch((error) => {
    console.error("Failed to start client:", error); // Log error if client fails to start
    process.exit(1); // Exit with a non-zero status code to indicate failure
  });
}

// Export the SecureMessagingClient class so it can be used in other modules
export { SecureMessagingClient };
