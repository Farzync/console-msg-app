# Changelog

All notable changes to the Secure Messaging App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Basic user commands (/help, /quit, /clear, etc.)
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
