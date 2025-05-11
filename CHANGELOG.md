# Changelog (Template)

All notable changes to the Secure Messaging App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-05-11

### Added

- Dual timestamp system showing both sent and received times for messages
- Enhanced logging with timestamps for all server events
- Improved client-side message display format showing both timestamps
- Fixed "double new connection" issue by improving connection handling logic
- Global error handling for uncaught exceptions and unhandled promise rejections in client and server
- Connection status tracking and logging in SecureMessagingClient (Connected, Disconnected, Connecting)
- Validation for username and password prompts in the client
- Refactored server configuration prompts into a separate utility function
- Diffie-Hellman key pair generation and shared secret computation for client-server communication
- Rate limiting for login attempts in SecureMessagingServer

### Fixed

- Resolved connection processing duplication issue
- Optimized memory usage in message handling
- Enhanced error recovery mechanisms
- Enhanced error logging in SecureMessagingServer

## [1.0.0] - 2025-05-10

### Added

- Initial release of Secure Messaging App
- End-to-end encryption using RSA for key exchange and AES-GCM for message encryption
- Terminal-based user interface
- Client-server architecture
- Cross-platform support (Windows, Linux)
- Executable builds for easy distribution
- User authentication system
- Real-time messaging capabilities
- Message history with local encryption
- User presence indicators
- Configuration options via command line arguments
- Basic user commands (/leave)
- Connection status indicators
- Error handling and recovery mechanisms

### Security

- Implemented perfect forward secrecy
- Zero plaintext message storage
- Message authentication via GCM
- Ephemeral key generation for each session
- Secure key exchange protocol
- Input validation to prevent injection attacks

## [0.9.0] - 2025-05-04 [BETA]

### Added

- Beta version with core functionality
- Basic end-to-end encryption
- Command line interface
- Server and client components
- Basic user authentication

### Fixed

- Memory usage optimization
- Connection stability improvements
- Encryption performance enhancements

## [0.5.0] - 2025-04-30 [ALPHA]

### Added

- Proof of concept implementation
- Basic terminal UI
- Initial encryption implementation
- Simple client-server communication

### Known Issues

- Memory leaks during extended usage
- Occasional connection drops
- Limited error recovery
