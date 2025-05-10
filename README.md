# 🔐 Secure Messaging App

A terminal-based chat application with end-to-end encryption for secure communication.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)

## 📝 Description

Secure Messaging App is a lightweight, terminal-based chat application that prioritizes privacy through end-to-end encryption. Built with NodeJS and TypeScript, this application offers secure communication over insecure networks through a combination of RSA and AES-GCM encryption techniques.

## ✨ Features

- 🔒 End-to-End Encryption using RSA + AES-GCM
- 💻 Terminal-based user interface
- 🌐 Client-server architecture
- 📱 Cross-platform compatibility (Windows, Linux)
- 🚀 Executable builds for easy distribution
- 🧵 Lightweight with minimal dependencies

## 🔧 Technologies

- **TypeScript**: For type-safe development
- **Node.js**: JavaScript runtime
- **Crypto**: Node.js built-in crypto module for encryption
- **esbuild**: For bundling the application
- **pkg**: For creating standalone executables

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

## 🚀 Installation

### Clone the repository

```bash
git clone https://github.com/Farzync/secure-console-messaging-app.git
cd secure-console-messaging-app
```

### Install dependencies

```bash
npm install
```

## 💻 Usage

### Development mode

Start the server:

```bash
npm run dev:server
```

In a separate terminal, start the client:

```bash
npm run dev:client
```

### Production mode

Build the application:

```bash
npm run build
```

Start the server:

```bash
npm run start:server
```

Start the client:

```bash
npm run start:client
```

### Build executables

Build executables for both Windows and Linux:

```bash
npm run build:all
```

The executables will be available in the `build/server` and `build/client` directories.

## 🔐 Security Features

### Encryption Protocol

This application implements a two-layer encryption protocol:

1. **RSA Key Exchange**: Used for initial handshake and secure exchange of AES keys
2. **AES-GCM**: Used for encrypting the actual message content with perfect forward secrecy

### Security Best Practices

- No plaintext message storage
- Zero trust architecture
- Perfect forward secrecy
- Ephemeral key generation
- Message authentication via GCM

## 📁 Project Structure

```
secure-messaging-app/
│   .gitignore
│   LICENSE
│   package-lock.json
│   package.json
│   README.md
│   tsconfig.json
│
└───src
    ├───build
    │       client.js
    │       server.js
    │
    ├───client
    │   │   index.ts
    │   │   messagingClient.ts
    │   │   types.ts
    │   │
    │   └───utils
    │           connection.ts
    │           encryption.ts
    │           prompt.ts
    │           timestamp.ts
    │
    └───server
        │   index.ts
        │   messagingServer.ts
        │   types.ts
        │
        └───utils
                encryption.ts
                port.ts
                prompt.ts
                timestamp.ts
```

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Faeza Raziq**

- Email: faezaraziqg@gmail.com
- GitHub: [Farzync](https://github.com/Farzync)

---

Made with paranoia and love by Faeza Raziq.
