// src/client/secureMessagingClient.ts
import * as net from "net";
import * as readline from "readline";
import { Message, KeyPair } from "./types";
import { getTimestamp } from "./utils/timestamp";
import {
  generateKeyPair,
  encryptMessage,
  decryptMessage,
  decryptAESKey,
} from "./utils/encryption";
import { isServerAvailable, createConnection } from "./utils/connection";
import {
  createReadlineInterface,
  promptUser,
  setupLineHandler,
  clearCurrentLine,
  displayMessagePrompt,
} from "./utils/prompt";

export class SecureMessagingClient {
  private socket: net.Socket | null = null;
  private rl: readline.Interface;
  private username: string = "";
  private keyPair: KeyPair;
  private sharedSecret: Buffer | null = null;
  private buffer: string = "";
  private authenticated: boolean = false;
  private reconnecting: boolean = false;
  private serverAddress: string = "";
  private serverPort: number = 0;

  constructor() {
    // Create readline interface for user input
    this.rl = createReadlineInterface();

    // Generate client's RSA key pair for key exchange
    this.keyPair = generateKeyPair();
  }

  public async start(): Promise<void> {
    try {
      this.serverAddress = await promptUser(
        this.rl,
        "Input IP Address or Domain: "
      );
      this.serverPort = parseInt(await promptUser(this.rl, "Input Port: "), 10);

      const isAvailable = await isServerAvailable(
        this.serverAddress,
        this.serverPort
      );
      if (!isAvailable) {
        console.error("Server is not running at that address/port.");
        this.cleanupAndExit();
        return;
      }

      console.log("Server is up! Proceeding...");
      await this.promptForUsername();
    } catch (error) {
      console.error("Error starting client:", error);
      this.cleanupAndExit();
    }
  }

  private async promptForUsername(
    message: string = "Input Username: "
  ): Promise<void> {
    try {
      this.username = await promptUser(this.rl, message);

      // Connect after username is provided
      await this.connect(this.serverAddress, this.serverPort);
    } catch (error) {
      console.error("Error during username prompt:", error);
      this.cleanupAndExit();
    }
  }

  private cleanupAndExit(): void {
    if (this.socket) {
      // Make sure socket is closed
      this.socket.destroy();
      this.socket = null;
    }
    // Close readline and exit
    this.rl.close();
    process.exit(0);
  }

  private connect(ipAddress: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const handleData = (data: Buffer) => {
        this.buffer += data.toString();

        let messageEndIndex: number;
        // Process complete messages
        while ((messageEndIndex = this.buffer.indexOf("\n")) !== -1) {
          const rawMessage = this.buffer.substring(0, messageEndIndex);
          this.buffer = this.buffer.substring(messageEndIndex + 1);

          try {
            const message: Message = JSON.parse(rawMessage);
            this.handleMessage(message);
          } catch (error) {
            console.error("Error processing message:", error);
            // Redisplay the prompt
            if (this.authenticated) {
              displayMessagePrompt();
            }
          }
        }
      };

      const handleError = (err: Error) => {
        if ((err as NodeJS.ErrnoException).code === "ECONNRESET") {
          console.warn("Server disconnected abruptly.");
        } else {
          console.error("Connection error:", err);
        }
        this.cleanupAndExit();
      };

      const handleClose = () => {
        console.log("Connection closed by server");
        if (this.reconnecting) {
          this.reconnecting = false;
          return;
        }
        this.cleanupAndExit();
      };

      this.socket = createConnection(
        ipAddress,
        port,
        () => {
          console.log(`Connected to ${ipAddress}:${port}`);
          // Send username and public key to the server
          this.sendPublicKey();
          resolve();
        },
        handleData,
        handleError,
        handleClose
      );
    });
  }

  private sendPublicKey(): void {
    if (!this.socket) return;

    const message: Message = {
      type: "publicKey",
      sender: this.username,
      content: this.keyPair.publicKey,
      timestamp: getTimestamp(),
    };

    this.socket.write(JSON.stringify(message) + "\n");
  }

  private handleMessage(message: Message): void {
    // Handle username taken message
    if (
      message.type === "usernameResult" &&
      message.content === "username_taken"
    ) {
      console.error(
        "Username already taken. Please choose a different username."
      );

      // Set reconnecting flag to prevent exit on socket close
      this.reconnecting = true;

      // Close current connection and prompt for a new username
      if (this.socket) {
        this.socket.end();
        this.socket = null;
      }

      // Reset state for a clean reconnection
      this.sharedSecret = null;
      this.authenticated = false;
      this.buffer = "";

      // Ask for a new username
      setTimeout(() => {
        this.promptForUsername("Please choose a different username: ");
      }, 1000);

      return;
    }

    if (message.type === "publicKey" && message.sender === "Server") {
      // Received the encrypted AES key from server
      this.handleKeyExchange(message.content);
      return;
    }

    if (message.type === "authResult") {
      if (message.content === "password_required") {
        // Server requires a password
        this.promptForPassword();
        return;
      } else if (message.content === "authenticated") {
        // Authentication successful
        this.authenticated = true;
        console.log("Authentication successful. You've joined the chat.");
        // Start listening for user input now that we're authenticated
        this.listenForUserInput();
        // Display the prompt for the first message
        displayMessagePrompt();
        return;
      } else if (message.content === "authentication_failed") {
        // Authentication failed
        console.error("Authentication failed. Incorrect password.");
        console.log("Connection will be closed.");
        return;
      }
    }

    // For regular messages, decrypt if needed
    if (
      message.type === "message" &&
      message.iv &&
      message.authTag &&
      this.sharedSecret
    ) {
      try {
        // Decrypt the message content
        const decryptedContent = decryptMessage(
          message.content,
          message.iv,
          message.authTag,
          this.sharedSecret
        );

        // Move to a new line to avoid conflicting with the prompt
        clearCurrentLine();

        // Display the decrypted message
        console.log(
          `[${message.timestamp}] ${message.sender}: ${decryptedContent}`
        );

        // Redisplay the prompt
        if (this.authenticated) {
          displayMessagePrompt();
        }
      } catch (error) {
        console.error("Error decrypting message:", error);
        // Redisplay the prompt
        if (this.authenticated) {
          displayMessagePrompt();
        }
      }
    } else {
      // For system messages (join/leave)
      // Move to a new line to avoid conflicting with the prompt
      clearCurrentLine();

      console.log(
        `[${message.timestamp}] ${message.sender}: ${message.content}`
      );

      // Redisplay the prompt
      if (this.authenticated) {
        displayMessagePrompt();
      }
    }
  }

  private promptForPassword(): void {
    this.rl.question("Server password: ", (password) => {
      if (!this.sharedSecret || !this.socket) {
        console.error("Secure connection not established");
        this.cleanupAndExit();
        return;
      }

      try {
        // Encrypt the password
        const { encrypted, iv, authTag } = encryptMessage(
          password,
          this.sharedSecret
        );

        const authMessage: Message = {
          type: "auth",
          sender: this.username,
          content: encrypted,
          iv,
          authTag,
          timestamp: getTimestamp(),
        };

        this.socket.write(JSON.stringify(authMessage) + "\n");
      } catch (error) {
        console.error("Error sending password:", error);
        this.cleanupAndExit();
      }
    });
  }

  private handleKeyExchange(encryptedKeyBase64: string): void {
    try {
      // Decrypt the AES key using our private key
      const decryptedKey = decryptAESKey(
        encryptedKeyBase64,
        this.keyPair.privateKey
      );

      // Store the shared secret (AES key)
      this.sharedSecret = decryptedKey;

      console.log("Secure connection established with end-to-end encryption");
    } catch (error) {
      console.error("Error during key exchange:", error);
    }
  }

  private listenForUserInput(): void {
    setupLineHandler(this.rl, (input) => {
      if (input === "/leave") {
        // Send leave message and close connection
        this.sendMessage(input);
        if (this.socket) {
          this.socket.end();
        }
        return;
      }

      this.sendMessage(input);

      // Display prompt for next message
      displayMessagePrompt();
    });
  }

  private sendMessage(content: string): void {
    if (!this.socket || !this.sharedSecret || !this.authenticated) return;

    try {
      // Encrypt the message content
      const { encrypted, iv, authTag } = encryptMessage(
        content,
        this.sharedSecret
      );

      const message: Message = {
        type: "message",
        sender: this.username,
        content: encrypted,
        iv,
        authTag,
        timestamp: getTimestamp(),
      };

      this.socket.write(JSON.stringify(message) + "\n");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }
}
