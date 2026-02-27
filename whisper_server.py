"""
Local Whisper Server
Run: python whisper_server.py
"""

from flask import Flask, request, jsonify
from faster_whisper import WhisperModel
import tempfile
import os

app = Flask(__name__)

# Load model (第一次會 download，之後會cache)
# 可選: tiny, base, small, medium, large-v2, large-v3
print("Loading Whisper model...")
model = WhisperModel("small", device="cpu", compute_type="int8")
print("Model loaded! Server ready at http://localhost:5000")

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file'}), 400
    
    audio_file = request.files['audio']
    
    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name
    
    try:
        # Transcribe
        segments, info = model.transcribe(tmp_path, language='zh')
        
        text = ' '.join([seg.text for seg in segments])
        
        return jsonify({
            'text': text,
            'language': info.language,
            'language_probability': info.language_probability
        })
    finally:
        os.unlink(tmp_path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
