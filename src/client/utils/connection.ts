// src/client/utils/connection.ts
import * as net from "net";

/**
 * Memeriksa apakah server tersedia pada host dan port tertentu
 */
export function isServerAvailable(
  host: string,
  port: number
): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createConnection({ host, port }, () => {
      tester.end();
      resolve(true);
    });

    tester.on("error", () => resolve(false));
  });
}

/**
 * Membuat koneksi socket ke server
 */
export function createConnection(
  ipAddress: string,
  port: number,
  onConnect: () => void,
  onData: (data: Buffer) => void,
  onError: (error: Error) => void,
  onClose: () => void
): net.Socket {
  const socket = net.createConnection({ host: ipAddress, port }, onConnect);

  socket.on("data", onData);
  socket.on("error", onError);
  socket.on("close", onClose);

  return socket;
}
