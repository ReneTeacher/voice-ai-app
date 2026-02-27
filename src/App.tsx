import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Copy, RefreshCw, Settings } from 'lucide-react'

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

  // Process audio with LOCAL Whisper + optional GPT polish
  const processAudio = async (audioBlob: Blob) => {
    try {
      // Send to local Whisper server
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const whisperResponse = await fetch('http://localhost:5001/transcribe', {
        method: 'POST',
        body: formData
      })

      if (!whisperResponse.ok) {
        throw new Error('Whisper server not running')
      }

      const whisperData = await whisperResponse.json()
      const transcript = whisperData.text || ''

      setState(prev => ({ ...prev, transcript }))

      // If OpenAI key exists, polish with GPT (optional)
      if (state.apiKey) {
        const polishResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${state.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a professional editor. Clean up the transcribed text: remove filler words (um, uh, like, you know), fix grammar, improve clarity, but keep the original meaning and tone. Return only the cleaned text, nothing else.' },
              { role: 'user', content: transcript }
            ]
          })
        })

        const polishData = await polishResponse.json()
        const polished = polishData.choices?.[0]?.message?.content || transcript
        setState(prev => ({ ...prev, polishedText: polished, isProcessing: false }))
      } else {
        // No API key, just use raw transcript
        setState(prev => ({ ...prev, polishedText: transcript, isProcessing: false }))
      }
    } catch (err) {
      console.error('Error processing audio:', err)
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        polishedText: 'Error! Make sure Whisper server is running: python whisper_server.py'
      }))
    }
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
            <p style={{ fontSize: '0.75rem', color: '#22c55e', marginBottom: '4px' }}>
              {state.apiKey ? '✨ Polished (AI):' : '📝 Transcribed:'}
            </p>
            <p className="output-text">{state.polishedText}</p>
          </>
        ) : (
          <p className="output-text output-placeholder">
            {state.isProcessing ? 'Processing...' : 'Your text will appear here'}
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
            <label>OpenAI API Key (Optional - for AI polishing)</label>
            <input 
              type="password" 
              value={state.apiKey}
              onChange={(e) => saveApiKey(e.target.value)}
              placeholder="sk-... (leave empty for local only)"
            />
          </div>
          <p style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '8px' }}>
            💡 Without API key: uses local Whisper only (free!)
          </p>
          <p className="shortcut-hint">
            Tip: Press Ctrl+Shift+V to start recording from anywhere!
          </p>
        </div>
      )}
    </div>
  )
}

export default App
