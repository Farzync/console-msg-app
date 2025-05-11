import { isPortInUse } from "./port";
import * as readline from "readline";

function promptUser(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

export async function getServerConfig(): Promise<{
  port: number;
  password?: string;
}> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const portInput = await promptUser(rl, "Set server port (default 25525): ");
  const port = parseInt(portInput.trim()) || 25525;

  if (isNaN(port)) {
    console.error("Port must be a number.");
    rl.close();
    throw new Error("Invalid port");
  }

  if (await isPortInUse(port)) {
    console.error("Port is already in use.");
    rl.close();
    throw new Error("Port in use");
  }

  const password = await promptUser(
    rl,
    "Set server password (leave blank for none): "
  );
  rl.close();

  return { port, password: password || undefined };
}
