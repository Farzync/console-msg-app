import * as net from "net";

/**
 * Checks if a server is available on a specific host and port.
 * Returns `true` if the connection is successful, `false` if it fails (e.g., server is down or port is closed).
 */
export function isServerAvailable(
  host: string,
  port: number
): Promise<boolean> {
  return new Promise((resolve) => {
    // Attempt to create a connection to the host and port
    const tester = net.createConnection({ host, port }, () => {
      // If the connection is successful, immediately close it
      tester.end();
      resolve(true); // Server is available
    });

    // If an error occurs (e.g., connection refused), assume the server is unavailable
    tester.on("error", () => resolve(false));
  });
}

/**
 * Creates a TCP socket connection to a server.
 * Sets up callbacks for various events: successful connection, data received, error, and connection closed.
 * 
 * @param ipAddress - The target server's IP address
 * @param port - The server's port
 * @param onConnect - Callback when the connection is successful
 * @param onData - Callback when data is received from the server
 * @param onError - Callback when an error occurs
 * @param onClose - Callback when the connection is closed
 * @returns An active TCP socket object
 */
export function createConnection(
  ipAddress: string,
  port: number,
  onConnect: () => void,
  onData: (data: Buffer) => void,
  onError: (error: Error) => void,
  onClose: () => void
): net.Socket {
  // Create a TCP connection to the server
  const socket = net.createConnection({ host: ipAddress, port }, onConnect);

  // Event listener for when data is received from the server
  socket.on("data", onData);

  // Event listener to handle errors
  socket.on("error", onError);

  // Event listener for when the connection is closed (by either the server or client)
  socket.on("close", onClose);

  return socket;
}
