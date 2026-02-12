// src/AudioRecorder.jsx
import React, { useState } from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';

function AudioRecorder({ onStopCapture }) {
  const [recording, setRecording] = useState(false);
  const { status, startRecording, stopRecording, mediaBlobUrl } =
    useReactMediaRecorder({
      audio: true,
      blobPropertyBag: { type: 'audio/webm; codecs=opus' } // Enforce proper MIME type
    });

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      if (!blob || blob.size === 0) return reject('Empty audio blob');
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const handleStop = async () => {
    stopRecording();
    setRecording(false);

    try {
      const resp = await fetch(mediaBlobUrl);
      const contentType = resp.headers.get('Content-Type');
      console.log('Fetched audio MIME type:', contentType); // Debug log

      const blob = await resp.blob();
      const base64 = await blobToBase64(blob);

      if (!base64.startsWith('data:audio/')) {
        console.error('Unexpected base64 prefix:', base64.substring(0, 30));
        alert('Unexpected audio format detected.');
        return;
      }

      onStopCapture(base64);
    } catch (err) {
      console.error('Error fetching or converting audio:', err);
      alert('Failed to process audio.');
    }
  };

  return (
    <div className="mb-4">
      <p>Status: {status}</p>
      <button
        onClick={() => {
          startRecording();
          setRecording(true);
        }}
        disabled={recording}
        className="px-4 py-2 bg-blue-500 text-white rounded mr-2"
      >
        Start Recording
      </button>
      <button
        onClick={handleStop}
        disabled={!recording}
        className="px-4 py-2 bg-red-500 text-white rounded"
      >
        Stop & Analyze
      </button>
    </div>
  );
}

export default AudioRecorder;
