// src/server/messagingServer.ts
import * as net from "net";
import * as crypto from "crypto";
import { randomBytes } from "crypto";
import { Client, Message } from "./types";
import { isPortInUse } from "./utils/port";
import { askQuestion } from "./utils/prompt";
import { decryptAES, encryptAES } from "./utils/encryption";
import { getTimestamp } from "./utils/timestamp";

// Define the SecureMessagingServer class to handle all messaging logic
export class SecureMessagingServer {
  private server: net.Server; // Net server to handle incoming socket connections
  private clients: Map<string, Client> = new Map(); // Map to store active clients
  private serverKeyPair: { publicKey: string; privateKey: crypto.KeyObject }; // RSA key pair for encryption
  private serverPassword: string | null = null; // Optional server password for authentication

  constructor(private port: number) {
    // Generate RSA key pair for server's encryption/decryption
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048, // RSA modulus length (security strength)
      publicKeyEncoding: {
        type: "spki", // Standard format for public key
        format: "pem", // PEM format for easy handling
      },
      privateKeyEncoding: {
        type: "pkcs8", // Standard format for private key
        format: "pem", // PEM format
      },
    });

    this.serverKeyPair = {
      publicKey,
      privateKey: crypto.createPrivateKey(privateKey), // Private key as KeyObject
    };

    this.server = net.createServer(this.handleConnection.bind(this)); // Create a TCP server
  }

  // Start the server and optionally request a password for authentication
  public async start(passwordFromArgs?: string): Promise<void> {
    // Check if the specified port is in use
    const portInUse = await isPortInUse(this.port);
    if (portInUse) {
      console.error(`Error: Port ${this.port} is already in use.`); // Exit if port is busy
      process.exit(1);
    }

    // If password is provided in arguments, use it; otherwise, prompt user for password
    if (passwordFromArgs !== undefined) {
      if (passwordFromArgs.trim() === "") {
        this.serverPassword = null;
      } else {
        this.serverPassword = passwordFromArgs.trim();
      }
    } else {
      // Ask user to set a password if none provided
      this.serverPassword = await askQuestion(
        "Set server password (leave blank for none): "
      );
      if (this.serverPassword === "") {
        this.serverPassword = null;
      }
    }

    // Start the server and log status
    this.server.listen(this.port, () => {
      const status = this.serverPassword
        ? "with password protection"
        : "without password";
      console.log(
        `Secure messaging server started on port ${this.port} ${status}`
      );
    });
  }

  // Handle incoming connections from clients
  private handleConnection(socket: net.Socket): void {
    console.log(
      `New connection from ${socket.remoteAddress}:${socket.remotePort}`
    );

    let buffer = ""; // Buffer to store incoming data
    let client: Client | null = null; // Client object for each connected user

    socket.on("data", (data) => {
      buffer += data.toString(); // Add new data to the buffer

      let messageEndIndex: number;
      // Process complete messages by checking for newline delimiter
      while ((messageEndIndex = buffer.indexOf("\n")) !== -1) {
        const rawMessage = buffer.substring(0, messageEndIndex); // Get the message up to the newline
        buffer = buffer.substring(messageEndIndex + 1); // Keep remaining data in buffer

        try {
          const message: Message = JSON.parse(rawMessage); // Parse the raw message

          // First message should contain username and public key
          if (message.type === "publicKey" && !client) {
            // Check if username is already taken
            if (this.isUsernameTaken(message.sender)) {
              this.sendUsernameTakenMessage(socket); // Notify the client if username is taken
              return;
            }

            // Create a new client object
            client = {
              socket,
              username: message.sender,
              publicKey: message.content,
              authenticated: false, // Not authenticated yet
            };

            // Setup secure connection for the client (key exchange)
            this.setupSecureConnection(client);

            // Store client temporarily in the clients map
            this.clients.set(message.sender, client);

            // If password is required, ask for authentication
            if (this.serverPassword) {
              this.requestAuthentication(client); // Ask for password if needed
            } else {
              // No password required, authenticate automatically
              client.authenticated = true;
              this.confirmAuthentication(client, true); // Confirm successful authentication
              this.announceClientJoined(client); // Announce client has joined the chat
            }
          }
          // Handle authentication message (for password verification)
          else if (message.type === "auth" && client && !client.authenticated) {
            // Decrypt the password using the shared secret AES key
            const password = decryptAES(
              message.content,
              message.iv || "",
              message.authTag || "",
              client.sharedSecret as Buffer
            );

            // Check if password matches the server's password
            const isAuthenticated = password === this.serverPassword;
            client.authenticated = isAuthenticated;

            // Send authentication result to client
            this.confirmAuthentication(client, isAuthenticated);

            if (isAuthenticated) {
              this.announceClientJoined(client); // Announce client if authenticated
            } else {
              // Disconnect client if authentication fails
              setTimeout(() => {
                socket.end();
              }, 1000); // Give time for the message to be sent before disconnecting
            }
          }
          // Handle regular messages
          else if (
            message.type === "message" &&
            client &&
            client.authenticated
          ) {
            if (message.content === "/leave") {
              // Handle "/leave" command to disconnect client
              this.handleClientDisconnect(client);
              socket.end();
              return;
            }

            // Decrypt the incoming message from the client
            const decryptedContent = decryptAES(
              message.content,
              message.iv || "",
              message.authTag || "",
              client.sharedSecret as Buffer
            );

            // Create a broadcast message and send it to all clients
            const broadcastMsg: Message = {
              type: "message",
              sender: message.sender,
              content: decryptedContent,
              timestamp: getTimestamp(),
            };

            this.broadcastMessage(broadcastMsg); // Send broadcast message
          }
        } catch (error) {
          console.error("Error processing message:", error); // Log error if message processing fails
        }
      }
    });

    // Handle socket errors (e.g., client disconnect)
    socket.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ECONNRESET") {
        console.warn(
          `Client ${client?.username || "<unknown>"} disconnected abruptly.`
        );
      } else {
        console.error("Socket error:", err);
      }

      if (client) {
        this.handleClientDisconnect(client); // Handle client disconnection
      }
    });

    // Handle socket close event
    socket.on("close", () => {
      if (client) {
        this.handleClientDisconnect(client); // Handle client disconnection when socket closes
      }
    });
  }

  // Check if a username is already taken by another client
  private isUsernameTaken(username: string): boolean {
    return this.clients.has(username); // Return true if username exists in the clients map
  }

  // Send a "username taken" message to the client
  private sendUsernameTakenMessage(socket: net.Socket): void {
    const msg: Message = {
      type: "usernameResult",
      sender: "Server",
      content: "username_taken",
      timestamp: getTimestamp(),
    };

    socket.write(JSON.stringify(msg) + "\n"); // Send message to client

    // Give client time to process the message before disconnecting
    setTimeout(() => {
      socket.end(); // Close the connection
    }, 1000);
  }

  // Request authentication from the client (password required)
  private requestAuthentication(client: Client): void {
    const authReqMsg: Message = {
      type: "authResult",
      sender: "Server",
      content: "password_required",
      timestamp: getTimestamp(),
    };

    client.socket.write(JSON.stringify(authReqMsg) + "\n"); // Send authentication request
  }

  // Confirm authentication result to the client
  private confirmAuthentication(client: Client, success: boolean): void {
    const result = success ? "authenticated" : "authentication_failed";

    const authResultMsg: Message = {
      type: "authResult",
      sender: "Server",
      content: result,
      timestamp: getTimestamp(),
    };

    client.socket.write(JSON.stringify(authResultMsg) + "\n"); // Send authentication result
  }

  // Announce that a client has successfully joined the chat
  private announceClientJoined(client: Client): void {
    console.log(`${client.username} has joined the chat`);

    this.broadcastMessage({
      type: "join",
      sender: "Server",
      content: `${client.username} has joined the chat`,
      timestamp: getTimestamp(),
    });
  }

  // Setup a secure connection by exchanging AES encryption keys
  private setupSecureConnection(client: Client): void {
    const clientPublicKey = crypto.createPublicKey(client.publicKey); // Create public key from client's public key

    // Generate a random AES key (shared secret) for encrypted communication
    const aesKey = randomBytes(32); // 256-bit AES key

    // Encrypt the AES key using the client's public RSA key
    const encryptedKey = crypto.publicEncrypt(clientPublicKey, aesKey);

    // Store the shared AES key for future communication with this client
    client.sharedSecret = aesKey;

    // Send the encrypted AES key to the client
    const keyExchangeMsg: Message = {
      type: "publicKey",
      sender: "Server",
      content: encryptedKey.toString("base64"),
      timestamp: getTimestamp(),
    };

    client.socket.write(JSON.stringify(keyExchangeMsg) + "\n"); // Send encrypted key
  }

  // Broadcast a message to all connected clients
  private broadcastMessage(message: Message): void {
    this.clients.forEach((client) => {
      // Only send to authenticated clients with a shared secret
      if (client.sharedSecret && client.authenticated) {
        if (message.type === "message") {
          // Encrypt the message for the client using their shared AES key
          const { encrypted, iv, authTag } = encryptAES(
            message.content,
            client.sharedSecret
          );
          const encryptedMsg: Message = {
            ...message,
            content: encrypted,
            iv,
            authTag,
          };
          client.socket.write(JSON.stringify(encryptedMsg) + "\n"); // Send encrypted message
        } else {
          // Send non-encrypted system messages
          client.socket.write(JSON.stringify(message) + "\n");
        }
      }
    });
  }

  // Handle client disconnection (cleanup and broadcast)
  private handleClientDisconnect(client: Client): void {
    if (client.disconnected) return; // Skip if already disconnected
    client.disconnected = true; // Mark client as disconnected

    console.log(`${client.username} has left the chat`);
    this.clients.delete(client.username); // Remove from active clients

    // Broadcast a "leave" message to all clients if the client was authenticated
    if (client.authenticated) {
      this.broadcastMessage({
        type: "leave",
        sender: "SERVER",
        content: `${client.username} has left the chat`,
        timestamp: getTimestamp(),
      });
    }
  }
}
