// src/client/types.ts
import * as crypto from "crypto";

export interface Message {
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

export interface KeyPair {
  publicKey: string;
  privateKey: crypto.KeyObject;
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}
