# Contributing to Secure Messaging App

First of all, thank you for considering contributing to Secure Messaging App! It's people like you who make this project better and more secure for everyone. This document provides guidelines and steps for contributing.

## Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to [faezaraziqg@gmail.com](mailto:faezaraziqg@gmail.com).

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find that the bug has already been reported. If you're unable to find an open issue addressing the problem, open a new one with the following information:

- **Title**: Clear and descriptive title
- **Description**: Detailed steps to reproduce the bug
- **Expected behavior**: What you expected to happen
- **Actual behavior**: What actually happened
- **Environment**: OS, Node.js version, and any other relevant details
- **Screenshots**: If applicable

### Suggesting Enhancements

Enhancement suggestions are welcome! When suggesting an enhancement, please provide:

- **Title**: Clear and descriptive title
- **Description**: Detailed explanation of the suggested enhancement
- **Rationale**: Why this enhancement would be useful
- **Alternative solutions**: Any alternative solutions or features you've considered

### Pull Requests

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

#### Pull Request Guidelines

- Update the README.md with details of changes if applicable
- Update the CHANGELOG.md following the format
- The PR should work across different platforms (Windows, Linux)
- Code should follow the existing style conventions
- Include appropriate tests
- Documentation should be updated if necessary

## Development Setup

1. Clone your fork of the repository
2. Install dependencies with `npm install`
3. Make your changes
4. Run tests to ensure your changes don't break existing functionality

## Styleguides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### TypeScript Styleguide

- Use 2 spaces for indentation
- Prefer `const` over `let` where possible
- Use PascalCase for type names
- Use camelCase for function and variable names
- Use PascalCase for classes
- Use whole words in names when possible

### Security Considerations

Given the nature of this project, security is paramount:

- Never commit credentials, private keys, or sensitive data
- Always use appropriate encryption for sensitive operations
- Consider the implications of your changes on user privacy
- When in doubt about security implications, ask for review

## Security Review Process

All security-related changes undergo an additional review process:

1. Security review by project maintainers
2. Verification of encryption implementations
3. Assessment of potential attack vectors

Thank you for contributing to making secure communication accessible to everyone!
