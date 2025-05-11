// src/server/index.ts
import { SecureMessagingServer } from "./messagingServer";
import { getServerConfig } from "./utils/serverConfig";

// Added global error handling for unexpected errors
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

/**
 * The entry point for starting the server.
 * Prompts the user for configuration options such as the server port and password,
 * and then starts the server using those configurations.
 */
(async () => {
  // Get server configuration (port and password) from the user
  const { port, password } = await getServerConfig();

  // Create and start the SecureMessagingServer with the configured port and password
  const server = new SecureMessagingServer(port);
  await server.start(password);
})();
