import * as net from "net";

/**
 * Checks if a given port is currently in use.
 * It attempts to bind a server to the port and checks for errors to determine if the port is available.
 *
 * @param port - The port to check
 * @returns A Promise that resolves with `true` if the port is in use, or `false` if it is available
 */
export async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net
      .createServer() // Create a temporary server to check the port
      .once("error", (err: any) => resolve(err.code === "EADDRINUSE")) // If error occurs due to the port being in use, resolve with true
      .once("listening", () => {
        tester.close(); // If no error occurs, close the server
        resolve(false); // Port is available
      })
      .listen(port); // Attempt to listen on the provided port
  });
}
