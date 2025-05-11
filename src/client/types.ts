// src/client/types.ts
import * as crypto from "crypto";

/**
 * Represents a message exchanged between the client and server.
 * The message can be of different types, such as a regular message, join/leave notifications,
 * public key exchanges, authentication, and username validation results.
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
  sender: string; // The username of the message sender
  content: string; // The content of the message (could be text or other data)
  iv?: string; // Initialization vector for encrypted messages (optional)
  authTag?: string; // Authentication tag for encrypted messages (optional)
  timestamp: string; // Timestamp when the message was sent
}

/**
 * Represents a pair of RSA public and private keys for encryption/decryption.
 */
export interface KeyPair {
  publicKey: string; // The public key (in PEM format)
  privateKey: crypto.KeyObject; // The private key as a KeyObject (used for decryption)
}

/**
 * Represents the encrypted data, including the encrypted message, IV, and authentication tag.
 */
export interface EncryptedData {
  encrypted: string; // The encrypted message, in base64 format
  iv: string; // The initialization vector used for encryption, in base64 format
  authTag: string; // The authentication tag, in base64 format, used for integrity verification
}
