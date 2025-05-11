// src/server/messagingClient.ts
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
  private socket: net.Socket | null = null; // Socket to communicate with the server
  private rl: readline.Interface; // Readline interface to handle user input
  private username: string = ""; // The username of the client
  private keyPair: KeyPair; // RSA key pair for encryption
  private sharedSecret: Buffer | null = null; // Shared AES key for encrypting messages
  private buffer: string = ""; // Buffer to store incoming data until it's complete
  private authenticated: boolean = false; // Flag indicating whether the client is authenticated
  private reconnecting: boolean = false; // Flag for reconnecting the client after failure
  private serverAddress: string = ""; // Server IP address or domain
  private serverPort: number = 0; // Server port number

  constructor() {
    // Create readline interface for user input
    this.rl = createReadlineInterface();

    // Generate client's RSA key pair for key exchange
    this.keyPair = generateKeyPair();
  }

  // Start the client and initiate connection to the server
  public async start(): Promise<void> {
    try {
      // Prompt user for server address and port
      this.serverAddress = await promptUser(
        this.rl,
        "Input IP Address or Domain: "
      );
      this.serverPort = parseInt(await promptUser(this.rl, "Input Port: "), 10);

      // Check if the server is available at the provided address and port
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
      await this.promptForUsername(); // Prompt for username after server availability
    } catch (error) {
      console.error("Error starting client:", error);
      this.cleanupAndExit();
    }
  }

  // Prompt user to enter their username
  private async promptForUsername(
    message: string = "Input Username: "
  ): Promise<void> {
    try {
      this.username = await promptUser(this.rl, message);

      // Connect to the server after username is provided
      await this.connect(this.serverAddress, this.serverPort);
    } catch (error) {
      console.error("Error during username prompt:", error);
      this.cleanupAndExit();
    }
  }

  // Cleanup and close connections gracefully
  private cleanupAndExit(): void {
    if (this.socket) {
      // Close socket if open
      this.socket.destroy();
      this.socket = null;
    }
    // Close readline interface and exit the process
    this.rl.close();
    process.exit(0);
  }

  // Establish a connection to the server
  private connect(ipAddress: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // Handle incoming data from the server
      const handleData = (data: Buffer) => {
        this.buffer += data.toString();

        let messageEndIndex: number;
        // Process complete messages in the buffer
        while ((messageEndIndex = this.buffer.indexOf("\n")) !== -1) {
          const rawMessage = this.buffer.substring(0, messageEndIndex);
          this.buffer = this.buffer.substring(messageEndIndex + 1);

          try {
            const message: Message = JSON.parse(rawMessage); // Parse the message
            this.handleMessage(message); // Handle the parsed message
          } catch (error) {
            console.error("Error processing message:", error);
            // Redisplay the prompt if authenticated
            if (this.authenticated) {
              displayMessagePrompt();
            }
          }
        }
      };

      // Handle errors during connection
      const handleError = (err: Error) => {
        if ((err as NodeJS.ErrnoException).code === "ECONNRESET") {
          console.warn("Server disconnected abruptly.");
        } else {
          console.error("Connection error:", err);
        }
        this.cleanupAndExit();
      };

      // Handle connection closure
      const handleClose = () => {
        console.log("Connection closed by server");
        if (this.reconnecting) {
          this.reconnecting = false;
          return;
        }
        this.cleanupAndExit();
      };

      // Create socket connection to the server
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

  // Send the public RSA key to the server
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

  // Handle incoming messages from the server
  private handleMessage(message: Message): void {
    // Handle username already taken error
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

      // Reset client state
      this.sharedSecret = null;
      this.authenticated = false;
      this.buffer = "";

      // Ask for a new username after a short delay
      setTimeout(() => {
        this.promptForUsername("Please choose a different username: ");
      }, 1000);

      return;
    }

    // Handle public key exchange
    if (message.type === "publicKey" && message.sender === "Server") {
      this.handleKeyExchange(message.content);
      return;
    }

    // Handle authentication results
    if (message.type === "authResult") {
      if (message.content === "password_required") {
        // If password is required, prompt the user for it
        this.promptForPassword();
        return;
      } else if (message.content === "authenticated") {
        // Successful authentication
        this.authenticated = true;
        console.log("Authentication successful. You've joined the chat.");
        this.listenForUserInput(); // Start listening for user input
        displayMessagePrompt(); // Show the message input prompt
        return;
      } else if (message.content === "authentication_failed") {
        // Authentication failed
        console.error("Authentication failed. Incorrect password.");
        return;
      }
    }

    // For regular messages, decrypt if necessary
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

        // Display the decrypted message
        clearCurrentLine(); // Clear the current line to avoid prompt conflict
        console.log(
          `[${message.timestamp}] ${message.sender}: ${decryptedContent}`
        );

        // Redisplay the prompt
        if (this.authenticated) {
          displayMessagePrompt();
        }
      } catch (error) {
        console.error("Error decrypting message:", error);
        if (this.authenticated) {
          displayMessagePrompt();
        }
      }
    } else {
      // For system messages (join/leave), display the message directly
      clearCurrentLine();
      console.log(
        `[${message.timestamp}] ${message.sender}: ${message.content}`
      );
      if (this.authenticated) {
        displayMessagePrompt();
      }
    }
  }

  // Prompt for password if required by the server
  private promptForPassword(): void {
    this.rl.question("Server password: ", (password) => {
      if (!this.sharedSecret || !this.socket) {
        console.error("Secure connection not established");
        this.cleanupAndExit();
        return;
      }

      try {
        // Encrypt the password and send it to the server
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

  // Handle key exchange and store the shared secret (AES key)
  private handleKeyExchange(encryptedKeyBase64: string): void {
    try {
      // Decrypt the AES key using the client's private key
      const decryptedKey = decryptAESKey(
        encryptedKeyBase64,
        this.keyPair.privateKey
      );

      // Store the shared secret for encrypting/decrypting messages
      this.sharedSecret = decryptedKey;

      console.log("Secure connection established with end-to-end encryption");
    } catch (error) {
      console.error("Error during key exchange:", error);
    }
  }

  // Start listening for user input to send messages
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

  // Send a message to the server
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
