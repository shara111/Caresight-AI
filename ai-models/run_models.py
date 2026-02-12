import logging
import subprocess
import base64
import numpy as np
import cv2
import librosa
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime, timezone
from fall_detection import detect_fall_from_images, detect_fall_frame
try:
    from transformers import pipeline
    summarizer = None  # Will be initialized later if available
except ImportError:
    print("Warning: transformers not available. Summarization will be disabled.")
    summarizer = None
import traceback
try:
    from pydub import AudioSegment
except ImportError:
    print("Warning: pydub not available. Some audio features may be limited.")
    AudioSegment = None
import io

# Configure logging to file
logging.basicConfig(filename="events.log",
                    level=logging.INFO,
                    format="%(asctime)s | %(message)s")

# ✅ Create Flask app before using @app.route
app = Flask(__name__)
CORS(app)

# Initialize summarizer if transformers is available
if 'summarizer' not in globals() or summarizer is None:
    try:
        from transformers import pipeline
        summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
        print("Summarizer initialized successfully")
    except Exception as e:
        print(f"Warning: Could not initialize summarizer: {e}")
        summarizer = None

def log_incident(source, event, confidence):
    timestamp = datetime.now(timezone.utc).isoformat()
    entry = {
        "timestamp": timestamp,
        "source": source,
        "event": event,
        "confidence": confidence
    }
    app.logger.info(entry)

def final_decision(video_res=None, audio_res=None):
    """
    Fusion logic to combine video and audio analysis results.
    Prioritizes video detection over audio detection for fall events.
    """
    if video_res and video_res['event']=='fall_detected':
        return video_res
    if audio_res and audio_res['event']=='fall_detected':
        return audio_res
    return video_res or audio_res or {"event":"normal_activity", "confidence": 0.0}

@app.route('/api/analyze', methods=['POST'])
def analyze_sequence():
    data = request.get_json()
    sequence_name = data.get('sequenceName')

    # Debug print statements
    print("Requested sequenceName:", sequence_name)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(base_dir, 'ai-models', 'sample_sequences', 'Labelled_Dataset', sequence_name)
    print("Looking for path:", dataset_path)

    if not sequence_name:
        return jsonify({'error': 'Missing sequenceName'}), 400

    # Absolute path handling - the dataset is in the ai-models subdirectory
    # base_dir = os.path.dirname(os.path.abspath(__file__))
    # dataset_path = os.path.join(base_dir, 'ai-models', 'sample_sequences', 'Labelled_Dataset', sequence_name)

    if not os.path.isdir(dataset_path):
        return jsonify({'error': f'Path not found: {dataset_path}'}), 404

    result = detect_fall_from_images(dataset_path)
    log_incident(source=f"sequence:{sequence_name}", event=result["event"], confidence=result["confidence"])
    return jsonify(result)

@app.route('/analyze-image', methods=['POST'])
def analyze_image():
    data = request.get_json()
    img_b64 = data.get('image')
    audio_b64 = data.get('audio')  # Optional audio data
    
    if not img_b64:
        return jsonify({'error': 'No image provided'}), 400

    try:
        # Process video
        if ',' in img_b64:
            img_b64 = img_b64.split(',', 1)[1]

        img_bytes = base64.b64decode(img_b64)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({'error': 'Failed to decode image'}), 400

        video_result = detect_fall_frame(frame)
        
        # Process audio if provided
        audio_result = None
        if audio_b64:
            try:
                # Split base64 string to remove header if present
                if ',' in audio_b64:
                    header, encoded = audio_b64.split(',', 1)
                else:
                    encoded = audio_b64
                    
                audio_bytes = base64.b64decode(encoded)

                # Save to temporary file
                tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
                tmp.write(audio_bytes)
                tmp.flush()
                tmp_path = tmp.name

                # Extract features using librosa
                y, sr = librosa.load(tmp_path, sr=None)
                energy = np.mean(librosa.feature.rms(y=y))
                event = "fall_detected" if energy > 0.05 else "normal_activity"
                confidence = float(min(max((energy * 10), 0.6), 0.95))

                # Clean up temporary file
                os.unlink(tmp_path)
                
                audio_result = {
                    "event": event,
                    "confidence": confidence,
                    "energy": energy
                }
            except Exception as audio_error:
                print(f"Audio processing error: {audio_error}")
                # Continue with video-only analysis
        
        # Use fusion logic to combine results
        final_result = final_decision(video_result, audio_result)
        
        # Log the incident with combined source
        source = "webcam+audio" if audio_result else "webcam"
        log_incident(source=source, event=final_result["event"], confidence=final_result["confidence"])
        
        # Add modality information to response
        final_result["modalities"] = {
            "video": video_result,
            "audio": audio_result
        }
        
        return jsonify(final_result)
    except Exception as e:
        return jsonify({'error': f'Decoding or processing error: {str(e)}'}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    entries = []
    if os.path.exists("events.log"):
        with open("events.log") as f:
            for line in f:
                line = line.strip()
                if not line:  # Skip empty lines
                    continue
                try:
                    ts, msg = line.split(" | ", 1)
                    # Only process lines that contain our custom incident logs (dict format)
                    if msg.strip().startswith('{') and msg.strip().endswith('}'):
                        import ast
                        obj = ast.literal_eval(msg.strip())
                        # Use the timestamp from the log entry itself, not the log timestamp
                        entries.append(obj)
                except (ValueError, SyntaxError):
                    # Skip lines that don't match expected format
                    continue
    return jsonify({"history": list(reversed(entries))})

@app.route('/api/reports', methods=['GET'])
def get_reports():
    logs = []
    if os.path.exists("events.log"):
        with open("events.log") as f:
            for line in f:
                line = line.strip()
                if not line:  # Skip empty lines
                    continue
                try:
                    ts, msg = line.split(" | ", 1)
                    # Only process lines that contain our custom incident logs (dict format)
                    if msg.strip().startswith('{') and msg.strip().endswith('}'):
                        import ast
                        obj = ast.literal_eval(msg.strip())
                        obj["timestamp"] = ts
                        logs.append(obj)
                except (ValueError, SyntaxError):
                    # Skip lines that don't match expected format
                    continue

    if not logs:
        return jsonify({"reports": []})

    text = "\n".join(
        f"{entry['timestamp']} – {entry['event']} ({int(entry['confidence']*100)}%) from {entry['source']}"
        for entry in logs[-5:]
    )

    if summarizer:
        try:
            summary = summarizer(text, max_length=60, min_length=20, do_sample=False)
            summary_text = summary[0]["summary_text"]
        except Exception as e:
            summary_text = f"Summary unavailable: {str(e)}"
    else:
        summary_text = "Summarization model not available. Showing recent incidents."
    
    return jsonify({
        "summary_text": summary_text,
        "raw": logs[-5:]
    })
@app.route('/api/role', methods=['GET'])
def get_role():
    role = request.args.get('role')
    if role not in ("caregiver", "admin"):
        role = "caregiver"
    return jsonify({"role": role})

@app.route('/api/analyze-audio', methods=['POST'])
def analyze_audio():
    try:
        print("Received audio request.")
        base64_audio = request.json.get('audio')
        if not base64_audio:
            return jsonify({'error': 'Missing audio payload'}), 400

        if ',' in base64_audio:
            base64_audio = base64_audio.split(',', 1)[1]

        print("Decoding Base64 audio data...")
        audio_data = base64.b64decode(base64_audio)

        # Save to a temporary .webm file
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_webm:
            tmp_webm.write(audio_data)
            tmp_webm_path = tmp_webm.name

        # Convert to WAV using ffmpeg CLI for better compatibility
        tmp_wav_path = os.path.join(tempfile.gettempdir(), "temp.wav")
        command = ["ffmpeg", "-y", "-i", tmp_webm_path, "-vn", tmp_wav_path]
        result = subprocess.run(command, capture_output=True)
        if result.returncode != 0:
            print("ffmpeg conversion failed:", result.stderr.decode())
            return jsonify({'error': 'Audio conversion failed'}), 500

        print("Loaded converted WAV with librosa...")
        y, sr = librosa.load(tmp_wav_path, sr=None)

        # Dummy analysis for now; replace with actual logic
        return jsonify({
            "summary": "Audio processed successfully.",
            "status": "analyzed"
        })

    except Exception as e:
        print("🔥 ERROR in /api/analyze-audio:")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze-multimodal', methods=['POST'])
def analyze_multimodal():
    """
    Multi-modal analysis endpoint that combines video and audio analysis.
    Expects both 'image' and 'audio' in the request JSON.
    """
    data = request.get_json()
    img_b64 = data.get('image')
    audio_b64 = data.get('audio')
    
    if not img_b64:
        return jsonify({'error': 'No image provided'}), 400
    if not audio_b64:
        return jsonify({'error': 'No audio provided'}), 400

    try:
        # Process video
        if ',' in img_b64:
            img_b64 = img_b64.split(',', 1)[1]

        img_bytes = base64.b64decode(img_b64)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({'error': 'Failed to decode image'}), 400

        video_result = detect_fall_frame(frame)
        
        # Process audio
        if ',' in audio_b64:
            header, encoded = audio_b64.split(',', 1)
        else:
            encoded = audio_b64
            
        audio_bytes = base64.b64decode(encoded)

        # Save to temporary file
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        tmp.write(audio_bytes)
        tmp.flush()
        tmp_path = tmp.name

        # Extract features using librosa
        y, sr = librosa.load(tmp_path, sr=None)
        energy = np.mean(librosa.feature.rms(y=y))
        event = "fall_detected" if energy > 0.05 else "normal_activity"
        confidence = float(min(max((energy * 10), 0.6), 0.95))

        # Clean up temporary file
        os.unlink(tmp_path)
        
        audio_result = {
            "event": event,
            "confidence": confidence,
            "energy": energy
        }
        
        # Use fusion logic to combine results
        final_result = final_decision(video_result, audio_result)
        
        # Log the incident
        log_incident(source="multimodal", event=final_result["event"], confidence=final_result["confidence"])
        
        # Add detailed modality information to response
        final_result["modalities"] = {
            "video": video_result,
            "audio": audio_result
        }
        
        return jsonify(final_result)
    except Exception as e:
        # Clean up temporary file if it exists
        if 'tmp_path' in locals():
            try:
                os.unlink(tmp_path)
            except:
                pass
        return jsonify({'error': f'Multi-modal processing error: {str(e)}'}), 500

@app.route('/api/clear-logs', methods=['POST'])
def clear_logs():
    try:
        # Clear the events.log file
        with open("events.log", "w") as f:
            f.write("")  # Write empty content to clear the file
        return jsonify({"message": "Incident logs cleared successfully"})
    except Exception as e:
        return jsonify({"error": f"Failed to clear logs: {str(e)}"}), 500

if __name__ == '__main__':
    print("Starting Flask app...")
    app.run(debug=True, port=8000)