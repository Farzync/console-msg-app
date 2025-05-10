// === CLIENT ===
// client.ts
import * as net from "net";
import * as crypto from "crypto";
import * as readline from "readline";

interface Message {
  type:
    | "message"
    | "join"
    | "leave"
    | "publicKey"
    | "auth"
    | "authResult"
    | "usernameResult";
  sender: string;
  content: string;
  iv?: string;
  authTag?: string;
  timestamp: string;
}

class SecureMessagingClient {
  private socket: net.Socket | null = null;
  private rl: readline.Interface;
  private username: string = "";
  private keyPair: { publicKey: string; privateKey: crypto.KeyObject };
  private sharedSecret: Buffer | null = null;
  private buffer: string = "";
  private authenticated: boolean = false;
  private reconnecting: boolean = false;
  private serverAddress: string = "";
  private serverPort: number = 0;

  constructor() {
    // Create readline interface for user input
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Generate client's RSA key pair for key exchange
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

    this.keyPair = {
      publicKey,
      privateKey: crypto.createPrivateKey(privateKey),
    };
  }

  public async start(): Promise<void> {
    try {
      this.serverAddress = await this.promptUser(
        "Input IP Address or Domain: "
      );
      this.serverPort = parseInt(await this.promptUser("Input Port: "), 10);

      const isAvailable = await this.isServerAvailable(
        this.serverAddress,
        this.serverPort
      );
      if (!isAvailable) {
        console.error("Server is not running at that address/port.");
        this.rl.close();
        process.exit(1);
      }

      console.log("Server is up! Proceeding...");
      await this.promptForUsername();
    } catch (error) {
      console.error("Error starting client:", error);
      this.rl.close();
      process.exit(1);
    }
  }

  private async promptForUsername(
    message: string = "Input Username: "
  ): Promise<void> {
    try {
      this.username = await this.promptUser(message);

      // Connect after username is provided
      await this.connect(this.serverAddress, this.serverPort);
    } catch (error) {
      console.error("Error during username prompt:", error);
      this.cleanupAndExit();
    }
  }

  private promptUser(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
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
      this.socket = net.createConnection({ host: ipAddress, port }, () => {
        console.log(`Connected to ${ipAddress}:${port}`);

        // Send username and public key to the server
        this.sendPublicKey();

        resolve();
      });

      // 1) Handle connection errors (including server sudden death)
      this.socket.on("error", (err) => {
        if ((err as NodeJS.ErrnoException).code === "ECONNRESET") {
          console.warn("Server disconnected abruptly.");
        } else {
          console.error("Connection error:", err);
        }
        this.cleanupAndExit(); // close rl & exit
      });

      // 2) Handle normal close
      this.socket.on("close", () => {
        console.log("Connection closed by server");
        if (this.reconnecting) {
          this.reconnecting = false;
          return;
        }
        this.cleanupAndExit();
      });

      this.socket.on("data", (data) => {
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
              process.stdout.write("#> ");
            }
          }
        }
      });
    });
  }

  private sendPublicKey(): void {
    if (!this.socket) return;

    const message: Message = {
      type: "publicKey",
      sender: this.username,
      content: this.keyPair.publicKey,
      timestamp: this.getTimestamp(),
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
        process.stdout.write("#> ");
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
        const decryptedContent = this.decryptMessage(
          message.content,
          message.iv,
          message.authTag,
          this.sharedSecret
        );

        // Move to a new line to avoid conflicting with the prompt
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);

        // Display the decrypted message
        console.log(
          `[${message.timestamp}] ${message.sender}: ${decryptedContent}`
        );

        // Redisplay the prompt
        if (this.authenticated) {
          process.stdout.write("#> ");
        }
      } catch (error) {
        console.error("Error decrypting message:", error);
        // Redisplay the prompt
        if (this.authenticated) {
          process.stdout.write("#> ");
        }
      }
    } else {
      // For system messages (join/leave)
      // Move to a new line to avoid conflicting with the prompt
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);

      console.log(
        `[${message.timestamp}] ${message.sender}: ${message.content}`
      );

      // Redisplay the prompt
      if (this.authenticated) {
        process.stdout.write("#> ");
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
        const { encrypted, iv, authTag } = this.encryptMessage(password);

        const authMessage: Message = {
          type: "auth",
          sender: this.username,
          content: encrypted,
          iv,
          authTag,
          timestamp: this.getTimestamp(),
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
      const encryptedKey = Buffer.from(encryptedKeyBase64, "base64");
      const decryptedKey = crypto.privateDecrypt(
        this.keyPair.privateKey,
        encryptedKey
      );

      // Store the shared secret (AES key)
      this.sharedSecret = decryptedKey;

      console.log("Secure connection established with end-to-end encryption");
    } catch (error) {
      console.error("Error during key exchange:", error);
    }
  }

  private encryptMessage(message: string): {
    encrypted: string;
    iv: string;
    authTag: string;
  } {
    if (!this.sharedSecret) {
      throw new Error("Secure connection not established");
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.sharedSecret, iv);

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

  private listenForUserInput(): void {
    this.rl.on("line", (input) => {
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
      process.stdout.write("#> ");
    });
  }

  private sendMessage(content: string): void {
    if (!this.socket || !this.sharedSecret || !this.authenticated) return;

    try {
      // Encrypt the message content
      const { encrypted, iv, authTag } = this.encryptMessage(content);

      const message: Message = {
        type: "message",
        sender: this.username,
        content: encrypted,
        iv,
        authTag,
        timestamp: this.getTimestamp(),
      };

      this.socket.write(JSON.stringify(message) + "\n");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  private getTimestamp(): string {
    const now = new Date();
    const timestamp = now.toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const milliseconds = String(now.getMilliseconds()).padStart(3, "0");
    return `${timestamp}.${milliseconds}`;
  }

  private isServerAvailable(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const tester = net.createConnection({ host, port }, () => {
        tester.end();
        resolve(true);
      });

      tester.on("error", () => resolve(false));
    });
  }
}

// Start the client when running this file directly
if (require.main === module) {
  const client = new SecureMessagingClient();
  client.start();
}
