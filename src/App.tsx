import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Copy, RefreshCw, Settings, Check } from 'lucide-react'

// Types
interface AppState {
  isRecording: boolean
  isProcessing: boolean
  transcript: string
  polishedText: string
  apiKey: string
  showSettings: boolean
}

function App() {
  const [state, setState] = useState<AppState>({
    isRecording: false,
    isProcessing: false,
    transcript: '',
    polishedText: '',
    apiKey: '',
    showSettings: false
  })
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Load API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key') || ''
    setState(prev => ({ ...prev, apiKey: savedKey }))
  }, [])

  // Listen for global shortcut trigger
  useEffect(() => {
    const handleTrigger = () => {
      if (!state.isRecording && !state.isProcessing) {
        startRecording()
      }
    }
    
    // @ts-ignore
    if (window.electronAPI?.onTriggerVoice) {
      // @ts-ignore
      window.electronAPI.onTriggerVoice(handleTrigger)
    }
  }, [state.isRecording, state.isProcessing])

  // Save API key when changed
  const saveApiKey = (key: string) => {
    localStorage.setItem('openai_api_key', key)
    setState(prev => ({ ...prev, apiKey: key }))
  }

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await processAudio(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setState(prev => ({ ...prev, isRecording: true, transcript: '', polishedText: '' }))
    } catch (err) {
      console.error('Error starting recording:', err)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop()
      setState(prev => ({ ...prev, isRecording: false, isProcessing: true }))
    }
  }

  // Process audio with Whisper + GPT
  const processAudio = async (audioBlob: Blob) => {
    if (!state.apiKey) {
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        polishedText: 'Please set your OpenAI API key in settings first!'
      }))
      return
    }

    try {
      // Convert audio to base64
      const reader = new FileReader()
      const audioBase64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1]
          resolve(base64)
        }
        reader.readAsDataURL(audioBlob)
      })

      // Call Whisper API
      const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.apiKey}`,
        },
        body: createFormData(audioBase64)
      })

      const whisperData = await whisperResponse.json()
      const transcript = whisperData.text || ''

      setState(prev => ({ ...prev, transcript }))

      // Polish with GPT
      const polishResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          { 
              role messages: [
           : 'system', 
              content: 'You are a professional editor. Clean up the transcribed text: remove filler words (um, uh, like, you know), fix grammar, improve clarity, but keep the original meaning and tone. Return only the cleaned text, nothing else.' 
            },
            { role: 'user', content: transcript }
          ]
        })
      })

      const polishData = await polishResponse.json()
      const polished = polishData.choices?.[0]?.message?.content || transcript

      setState(prev => ({ ...prev, polishedText: polished, isProcessing: false }))
    } catch (err) {
      console.error('Error processing audio:', err)
      setState(prev => ({ ...prev, isProcessing: false, polishedText: 'Error processing audio. Please try again.' }))
    }
  }

  // Create FormData for Whisper
  const createFormData = (audioBase64: string): FormData => {
    const formData = new FormData()
    const blob = base64ToBlob(audioBase64, 'audio/webm')
    formData.append('file', blob, 'recording.webm')
    formData.append('model', 'whisper-1')
    return formData
  }

  // Helper: base64 to Blob
  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }

  // Copy to clipboard
  const copyToClipboard = async () => {
    const text = state.polishedText || state.transcript
    // @ts-ignore
    if (window.electronAPI?.copyToClipboard) {
      // @ts-ignore
      await window.electronAPI.copyToClipboard(text)
    } else {
      await navigator.clipboard.writeText(text)
    }
    alert('Copied to clipboard!')
  }

  // Clear output
  const clearOutput = () => {
    setState(prev => ({ ...prev, transcript: '', polishedText: '' }))
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🎙️ Voice AI</h1>
      </header>

      <div className="recording-area">
        <button 
          className={`mic-button ${state.isRecording ? 'recording' : ''}`}
          onClick={state.isRecording ? stopRecording : startRecording}
          disabled={state.isProcessing}
        >
          {state.isRecording ? <MicOff size={32} color="white" /> : <Mic size={32} color="white" />}
        </button>
        
        <p className={`status ${state.isRecording ? 'listening' : ''}`}>
          {state.isProcessing 
            ? '🤔 Processing...' 
            : state.isRecording 
              ? '🎧 Listening... Click to stop' 
              : 'Click to start recording'}
        </p>
      </div>

      <div className="output-area">
        {state.transcript && (
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '4px' }}>Original:</p>
            <p className="output-text">{state.transcript}</p>
          </div>
        )}
        
        {state.polishedText ? (
          <>
            <p style={{ fontSize: '0.75rem', color: '#22c55e', marginBottom: '4px' }}>✨ Polished:</p>
            <p className="output-text">{state.polishedText}</p>
          </>
        ) : (
          <p className="output-text output-placeholder">
            {state.isProcessing ? 'AI is polishing your text...' : 'Your text will appear here'}
          </p>
        )}

        {(state.transcript || state.polishedText) && (
          <div className="actions">
            <button className="btn btn-primary" onClick={copyToClipboard}>
              <Copy size={16} /> Copy
            </button>
            <button className="btn" onClick={clearOutput}>
              <RefreshCw size={16} /> Clear
            </button>
          </div>
        )}
      </div>

      <button 
        className="btn" 
        style={{ marginTop: '16px' }}
        onClick={() => setState(prev => ({ ...prev, showSettings: !prev.showSettings }))}
      >
        <Settings size={16} /> {state.showSettings ? 'Hide' : 'Show'} Settings
      </button>

      {state.showSettings && (
        <div className="settings">
          <h3>⚙️ Settings</h3>
          <div className="input-group">
            <label>OpenAI API Key</label>
            <input 
              type="password" 
              value={state.apiKey}
              onChange={(e) => saveApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
          <p className="shortcut-hint">
            Tip: Press Ctrl+Shift+V (Windows) or Cmd+Shift+V (Mac) to start recording from anywhere!
          </p>
        </div>
      )}
    </div>
  )
}

export default App
