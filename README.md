# Voice AI - Typeless Clone

AI Voice Dictation App for macOS/Windows

## Features

- 🎙️ Voice Recording - Click to record, click again to stop
- ✨ AI Polishing - Automatically clean up filler words, fix grammar
- 📋 One-click Copy - Copy polished text to clipboard
- ⌨️ Global Shortcut - Press Ctrl/Cmd+Shift+V to start recording from anywhere

## Setup

```bash
# Install dependencies
cd voice-ai-app
npm install

# Run in development
npm run electron:dev
```

## Build for macOS/Windows

```bash
npm run build
```

## Requirements

- OpenAI API Key (for Whisper + GPT)
- Node.js 18+

## Usage

1. Enter your OpenAI API key in Settings
2. Click the microphone button to start recording
3. Speak naturally - the app will transcribe and polish your speech
4. Click Copy to copy the polished text to your clipboard

## Tech Stack

- Electron
- React + TypeScript
- Vite
- OpenAI Whisper API
- OpenAI GPT-4o
