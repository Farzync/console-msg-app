import * as net from "net";

export interface Client {
  socket: net.Socket;
  username: string;
  publicKey: string;
  sharedSecret?: Buffer;
  disconnected?: boolean;
  authenticated: boolean;
}

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
  password?: string;
}
