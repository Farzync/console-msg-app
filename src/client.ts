// === CLIENT ===
// client.ts
import * as net from "net";
import * as crypto from "crypto";
import * as readline from "readline";

interface Message {
  type: "message" | "join" | "leave" | "publicKey";
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
      // Get user information
      this.username = await this.promptUser("Input Username: ");
      const ipAddress = await this.promptUser("Input IP Address: ");
      const port = parseInt(await this.promptUser("Input Port: "), 10);

      // Connect to the server
      await this.connect(ipAddress, port);
    } catch (error) {
      console.error("Error starting client:", error);
      this.rl.close();
      process.exit(1);
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
      // Pastikan socket ditutup
      this.socket.destroy();
      this.socket = null;
    }
    // Tutup readline dan keluar
    this.rl.close();
    process.exit(0);
  }

  private connect(ipAddress: string, port: number): Promise<void> {
    return new Promise((resolve) => {
      this.socket = net.createConnection({ host: ipAddress, port }, () => {
        console.log(`Connected to ${ipAddress}:${port}`);

        // Send username and public key to the server
        this.sendPublicKey();

        // Start listening for user input
        this.listenForUserInput();

        resolve();
      });

      // 1) Tangani error koneksi (termasuk server mati mendadak)
      this.socket.on("error", (err) => {
        if ((err as NodeJS.ErrnoException).code === "ECONNRESET") {
          console.warn("Server disconnected abruptly.");
        } else {
          console.error("Connection error:", err);
        }
        this.cleanupAndExit(); // tutup rl & exit
      });

      // 2) Tangani close normal
      this.socket.on("close", () => {
        console.log("Connection closed by server");
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
            process.stdout.write("#> ");
          }
        }
      });

      this.socket.on("error", (err) => {
        console.error("Connection error:", err);
        reject(err);
      });

      this.socket.on("close", () => {
        console.log("Connection closed");
        this.rl.close();
        process.exit(0);
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
    if (message.type === "publicKey" && message.sender === "Server") {
      // Received the encrypted AES key from server
      this.handleKeyExchange(message.content);
      return;
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
        process.stdout.write("#> ");
      } catch (error) {
        console.error("Error decrypting message:", error);
        // Redisplay the prompt
        process.stdout.write("#> ");
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
      process.stdout.write("#> ");
    }
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

      // Show the input prompt after connection is established
      process.stdout.write("#> ");
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
    if (!this.socket || !this.sharedSecret) return;

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
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
}

// Start the client when running this file directly
if (require.main === module) {
  const client = new SecureMessagingClient();
  client.start();
}
function reject(err: Error) {
  throw new Error("Function not implemented.");
}
