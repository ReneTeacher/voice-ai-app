# Voice AI - Typeless Clone (本地版)

AI Voice Dictation App for macOS/Windows - 免費版本！

## Features

- 🎙️ Voice Recording - Click to record, click again to stop
- 🆓 **100% Free** - No API costs! Uses local Whisper
- ✨ AI Polishing (Optional) - Add OpenAI key for better results
- 📋 One-click Copy - Copy to clipboard
- ⌨️ Global Shortcut - Press Ctrl/Cmd+Shift+V

## Setup (2 Steps)

### Step 1: Install Python & Whisper

```bash
# Install Python (if not installed)
# macOS: brew install python
# Windows: https://www.python.org/downloads/

# Install dependencies
pip install faster-whisper flask cors
```

### Step 2: Run the App

**Terminal 1 - Start Whisper Server:**
```bash
cd voice-ai-app
python whisper_server.py
```
(第一次運行會 download 模型，等一陣~)

**Terminal 2 - Run Electron App:**
```bash
cd voice-ai-app
npm install
npm run electron:dev
```

## Usage

1. Click microphone to record
2. Speak in Cantonese/Mandarin/English
3. Click again to stop
4. Copy the text!

## Optional: AI Polishing

如果你想要 AI 執靚啲文字：
1. 去 https://platform.openai.com/api-keys
2. 拎個 API Key
3. Enter 入 Settings

無 API Key 都可以用，係免費既本地 Whisper！

## Tech Stack

- Electron
- React + TypeScript
- Vite
- **Faster-Whisper** (本地運行，免費！)

## Note

如果 Port 5000 被 AirPlay 佔用，個 App 會用 5001。

---
Made with ❤️ for free voice AI!
