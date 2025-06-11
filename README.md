# AetherCode

AetherCode is a real-time collaborative code editor MVP with AI-powered suggestions, session recording and playback, and workflow challenges.

## Project Structure

- **client/** – React + Redux front-end with Monaco Editor.
- **server/** – Node.js Express + Socket.IO backend.
- **crdt/** – Yjs-based CRDT synchronization service.
- **docs/** – Additional documentation and specifications.
- **scripts/** – Utility scripts for development and deployment.
- **infrastructure/** – Docker and Kubernetes configuration.

## Getting Started

Each directory contains a `README.md` with further details. Install dependencies according to the language requirements. The server uses Node.js packages listed in `server/package.json`, while Python utilities are listed in `requirements.txt`.
