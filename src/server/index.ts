import { SecureMessagingServer } from "./messagingServer";
import { askQuestion } from "./utils/prompt";
import { isPortInUse } from "./utils/port";

(async () => {
  let port = 25525;
  let password: string | undefined;

  const input = await askQuestion("Set server port (default 25525): ");
  const parsedPort = input.trim() === "" ? 25525 : parseInt(input.trim());
  if (!isNaN(parsedPort) && !(await isPortInUse(parsedPort))) {
    port = parsedPort;
  }

  password = await askQuestion("Set server password (leave blank for none): ");
  const server = new SecureMessagingServer(port);
  await server.start(password);
})();
