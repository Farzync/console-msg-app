import * as net from "net";
import * as crypto from "crypto";
import { randomBytes } from "crypto";
import * as readline from "readline";
import { Client, Message } from "./types";

export class SecureMessagingServer {
  private server: net.Server;
  private clients: Map<string, Client> = new Map();
  private serverKeyPair: { publicKey: string; privateKey: crypto.KeyObject };
  private serverPassword: string | null = null;

  constructor(private port: number) {
    // Generate server's key pair for key exchange
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    });

    this.serverKeyPair = {
      publicKey,
      privateKey: crypto.createPrivateKey(privateKey),
    };

    this.server = net.createServer(this.handleConnection.bind(this));
  }

  public async start(passwordFromArgs?: string): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (passwordFromArgs !== undefined) {
      if (passwordFromArgs.trim() === "") {
        this.serverPassword = null;
      } else {
        this.serverPassword = passwordFromArgs.trim();
      }
    } else {
      const input = await this.prompt(
        rl,
        "Set server password (leave blank for none): "
      );
      this.serverPassword = input === "" ? null : input;
    }

    rl.close();

    this.server.listen(this.port, () => {
      const status = this.serverPassword
        ? "with password protection"
        : "without password";
      console.log(
        `Secure messaging server started on port ${this.port} ${status}`
      );
    });
  }

  private prompt(rl: readline.Interface, question: string): Promise<string> {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  private handleConnection(socket: net.Socket): void {
    console.log(
      `New connection from ${socket.remoteAddress}:${socket.remotePort}`
    );

    let buffer = "";
    let client: Client | null = null;

    socket.on("data", (data) => {
      buffer += data.toString();

      let messageEndIndex: number;
      // Process complete messages
      while ((messageEndIndex = buffer.indexOf("\n")) !== -1) {
        const rawMessage = buffer.substring(0, messageEndIndex);
        buffer = buffer.substring(messageEndIndex + 1);

        try {
          const message: Message = JSON.parse(rawMessage);

          // Handle first message which should contain username and public key
          if (message.type === "publicKey" && !client) {
            // Check if username is already taken
            if (this.isUsernameTaken(message.sender)) {
              // Send username taken message
              this.sendUsernameTakenMessage(socket);
              return;
            }

            client = {
              socket,
              username: message.sender,
              publicKey: message.content,
              authenticated: false, // Not authenticated yet
            };

            // Generate shared secret using client's public key
            this.setupSecureConnection(client);

            // Store client temporarily without broadcasting join
            this.clients.set(message.sender, client);

            // If password is set, request authentication
            if (this.serverPassword) {
              this.requestAuthentication(client);
            } else {
              // No password required
              client.authenticated = true;
              this.confirmAuthentication(client, true);
              this.announceClientJoined(client);
            }
          }
          // Handle authentication message
          else if (message.type === "auth" && client && !client.authenticated) {
            // Decrypt the password using the shared secret
            const password = this.decryptMessage(
              message.content,
              message.iv || "",
              message.authTag || "",
              client.sharedSecret as Buffer
            );

            // Check if password is correct
            const isAuthenticated = password === this.serverPassword;
            client.authenticated = isAuthenticated;

            // Send authentication result
            this.confirmAuthentication(client, isAuthenticated);

            if (isAuthenticated) {
              // Announce client joined only if authenticated
              this.announceClientJoined(client);
            } else {
              // Disconnect unauthenticated client
              setTimeout(() => {
                socket.end();
              }, 1000); // Give time for the message to be sent
            }
          }
          // Handle regular messages
          else if (
            message.type === "message" &&
            client &&
            client.authenticated
          ) {
            if (message.content === "/leave") {
              this.handleClientDisconnect(client);
              socket.end();
              return;
            }

            // Decrypt the message using the shared secret
            const decryptedContent = this.decryptMessage(
              message.content,
              message.iv || "",
              message.authTag || "",
              client.sharedSecret as Buffer
            );

            // Re-encrypt the message for each recipient and broadcast
            const broadcastMsg: Message = {
              type: "message",
              sender: message.sender,
              content: decryptedContent,
              timestamp: message.timestamp,
            };

            this.broadcastMessage(broadcastMsg);
          }
        } catch (error) {
          console.error("Error processing message:", error);
        }
      }
    });

    socket.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ECONNRESET") {
        console.warn(
          `Client ${client?.username || "<unknown>"} disconnected abruptly.`
        );
      } else {
        console.error("Socket error:", err);
      }

      if (client) {
        this.handleClientDisconnect(client);
      }
    });

    socket.on("close", () => {
      if (client) {
        this.handleClientDisconnect(client);
      }
    });
  }

  // Check if a username is already taken
  private isUsernameTaken(username: string): boolean {
    return this.clients.has(username);
  }

  // Send username taken message to client
  private sendUsernameTakenMessage(socket: net.Socket): void {
    const msg: Message = {
      type: "usernameResult",
      sender: "Server",
      content: "username_taken",
      timestamp: this.getTimestamp(),
    };

    socket.write(JSON.stringify(msg) + "\n");

    // Give client time to process message before closing
    setTimeout(() => {
      socket.end();
    }, 1000);
  }

  private requestAuthentication(client: Client): void {
    const authReqMsg: Message = {
      type: "authResult",
      sender: "Server",
      content: "password_required",
      timestamp: this.getTimestamp(),
    };

    client.socket.write(JSON.stringify(authReqMsg) + "\n");
  }

  private confirmAuthentication(client: Client, success: boolean): void {
    const result = success ? "authenticated" : "authentication_failed";

    const authResultMsg: Message = {
      type: "authResult",
      sender: "Server",
      content: result,
      timestamp: this.getTimestamp(),
    };

    client.socket.write(JSON.stringify(authResultMsg) + "\n");
  }

  private announceClientJoined(client: Client): void {
    console.log(`${client.username} has joined the chat`);

    this.broadcastMessage({
      type: "join",
      sender: "Server",
      content: `${client.username} has joined the chat`,
      timestamp: this.getTimestamp(),
    });
  }

  private setupSecureConnection(client: Client): void {
    // Derive a shared secret using the client's public key
    const clientPublicKey = crypto.createPublicKey(client.publicKey);

    // Generate a random AES key that will be shared securely
    const aesKey = randomBytes(32); // 256-bit key

    // Encrypt the AES key with the client's public key
    const encryptedKey = crypto.publicEncrypt(clientPublicKey, aesKey);

    // Store the shared secret (AES key) for this client
    client.sharedSecret = aesKey;

    // Send the encrypted key to the client
    const keyExchangeMsg: Message = {
      type: "publicKey",
      sender: "Server",
      content: encryptedKey.toString("base64"),
      timestamp: this.getTimestamp(),
    };

    client.socket.write(JSON.stringify(keyExchangeMsg) + "\n");
  }

  private encryptMessage(
    message: string,
    sharedSecret: Buffer
  ): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", sharedSecret, iv);

    let encrypted = cipher.update(message, "utf8", "base64");
    encrypted += cipher.final("base64");
    const authTag = cipher.getAuthTag().toString("base64");

    return {
      encrypted,
      iv: iv.toString("base64"),
      authTag,
    };
  }

  private decryptMessage(
    encryptedMsg: string,
    ivString: string,
    authTagString: string,
    sharedSecret: Buffer
  ): string {
    const iv = Buffer.from(ivString, "base64");
    const authTag = Buffer.from(authTagString, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", sharedSecret, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedMsg, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  private broadcastMessage(message: Message): void {
    // For each client, encrypt the message with their individual shared secret
    this.clients.forEach((client) => {
      // Only send to authenticated clients
      if (client.sharedSecret && client.authenticated) {
        // Only for message types that need to be encrypted
        if (message.type === "message") {
          const { encrypted, iv, authTag } = this.encryptMessage(
            message.content,
            client.sharedSecret
          );
          const encryptedMsg: Message = {
            ...message,
            content: encrypted,
            iv,
            authTag,
          };
          client.socket.write(JSON.stringify(encryptedMsg) + "\n");
        } else {
          // System messages don't need encryption
          client.socket.write(JSON.stringify(message) + "\n");
        }
      }
    });
  }

  private handleClientDisconnect(client: Client): void {
    if (client.disconnected) return; // Already disconnected? skip.
    client.disconnected = true; // Mark as disconnected

    console.log(`${client.username} has left the chat`);
    this.clients.delete(client.username);

    // Only broadcast leave message if client was authenticated
    if (client.authenticated) {
      this.broadcastMessage({
        type: "leave",
        sender: "Server",
        content: `${client.username} has left the chat`,
        timestamp: this.getTimestamp(),
      });
    }
  }

  private getTimestamp(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
}
