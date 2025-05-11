// src/server/types.ts
import * as net from "net";

/**
 * Represents a connected client in the server.
 * Each client has a socket, username, public key, and other properties to manage their connection and authentication status.
 */
export interface Client {
  socket: net.Socket; // The socket for the client's connection
  username: string; // The client's username
  publicKey: string; // The client's public key, used for encryption
  sharedSecret?: Buffer; // An optional shared secret for encryption, if available
  disconnected?: boolean; // Flag to indicate if the client is disconnected
  authenticated: boolean; // Flag to indicate if the client is authenticated
}

/**
 * Represents a message exchanged between clients and the server.
 * The message type, sender, content, and optional encryption parameters (IV, authTag) are included.
 */
export interface Message {
  type:
    | "message" // Regular message
    | "join" // User joining the server
    | "leave" // User leaving the server
    | "publicKey" // A message containing a public key
    | "auth" // Authentication request
    | "authResult" // Authentication result
    | "usernameResult"; // Username validation result
  sender: string; // The sender's username
  content: string; // The message content (could be text or other data)
  iv?: string; // Initialization vector for encrypted messages (optional)
  authTag?: string; // Authentication tag for encrypted messages (optional)
  timestamp: string; // Timestamp when the message was sent
  password?: string; // Optional password field for authentication messages
}
