// src/server/index.ts
import { SecureMessagingServer } from "./messagingServer";
import { askQuestion } from "./utils/prompt";
import { isPortInUse } from "./utils/port";

/**
 * The entry point for starting the server.
 * Prompts the user for configuration options such as the server port and password,
 * and then starts the server using those configurations.
 */
(async () => {
  let port = 25525; // Default port number
  let password: string | undefined; // Server password, undefined if not provided

  // Ask the user for a custom port, defaulting to 25525 if no input is given
  const input = await askQuestion("Set server port (default 25525): ");
  const parsedPort = input.trim() === "" ? 25525 : parseInt(input.trim());

  // Check if the parsed port is valid and not in use
  if (!isNaN(parsedPort) && !(await isPortInUse(parsedPort))) {
    port = parsedPort; // Update port if valid
  }

  // Ask the user for a server password, leaving it undefined if the user doesn't provide one
  password = await askQuestion("Set server password (leave blank for none): ");

  // Create and start the SecureMessagingServer with the configured port and password
  const server = new SecureMessagingServer(port);
  await server.start(password);
})();
