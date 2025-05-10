import * as net from "net";

export async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", (err: any) => resolve(err.code === "EADDRINUSE"))
      .once("listening", () => {
        tester.close();
        resolve(false);
      })
      .listen(port);
  });
}
