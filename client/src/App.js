// client/src/App.js

import React, { useRef, useState, useCallback, useEffect } from "react";
import axios from "axios";
import Webcam from "react-webcam";
import AudioRecorder from "./AudioRecorder";

function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("sequence"); // "sequence" or "webcam"
  const [sequence, setSequence] = useState("Fall"); // Default sequence
  const [history, setHistory] = useState([]);
  const [report, setReport] = useState(null);
  const [role, setRole] = useState("caregiver"); // Role state management

  const webcamRef = useRef(null);

  // Fetch role from the API
  const fetchRole = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/role?role=admin");
      setRole(res.data.role);
    } catch (err) {
      console.error("Failed to fetch role:", err);
      setRole("caregiver"); // Default to caregiver on error
    }
  };

  // Fetch history from the API
  const fetchHistory = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/history");
      setHistory(res.data.history);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  // Fetch report from the API
  const fetchReport = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/reports");
      setReport(res.data);
    } catch {
      setReport({ error: "Failed to load report" });
    }
  };

  // Run once on mount
  useEffect(() => {
    fetchRole();
    fetchHistory();
    fetchReport();
  }, []);

  // Capture and analyze screenshot
  const captureSnapshot = useCallback(async () => {
    const imgSrc = webcamRef.current?.getScreenshot();
    if (!imgSrc) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post("http://localhost:8000/analyze-image", {
        image: imgSrc,
      });
      setResult(res.data);
    } catch (err) {
      setResult({ error: "Failed to connect to AI server" });
    }
    setLoading(false);
  }, []);

  const handleSequenceAnalyze = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post("http://localhost:8000/api/analyze", {
        sequenceName: sequence,
      });
      setResult(res.data);
    } catch (err) {
      setResult({ error: "Failed to connect to AI server" });
    }
    setLoading(false);
  };

  // Admin functions
  const clearIncidentLog = async () => {
    if (window.confirm("Are you sure you want to clear the incident log? This action cannot be undone.")) {
      try {
        const res = await axios.post("http://localhost:8000/api/clear-logs");
        alert(res.data.message);
        fetchHistory(); // Refresh the history
      } catch (err) {
        alert("Failed to clear incident log");
      }
    }
  };

  const viewFullLogs = () => {
    // In a real implementation, this would open a detailed log viewer
    alert("Full logs feature would open a detailed log viewer in a real implementation");
  };
  const handleAudioCapture = async (audioB64) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post("http://localhost:8000/api/analyze-audio", {
        audio: audioB64
      });
      setResult(res.data);
    } catch (err) {
      setResult({ error: "Failed to connect to AI server" });
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">
        CareSight AI Dashboard
      </h1>

      {/* Role Selector */}
      <div className="mb-4 p-3 bg-white rounded shadow">
        <label className="mr-2 font-medium">Current Role:</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="p-2 border rounded mr-4"
        >
          <option value="caregiver">Caregiver</option>
          <option value="admin">Admin</option>
        </select>
        <span className={`px-2 py-1 rounded text-sm font-medium ${
          role === "admin" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
        }`}>
          {role === "admin" ? "🔐 Admin Access" : "👨‍⚕️ Caregiver Access"}
        </span>
      </div>

      {/* Mode Switch */}
      <div className="mb-4">
        <label className="mr-2 font-medium">Mode:</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="sequence">Use Sample Sequence</option>
          <option value="webcam">Use Webcam Snapshot</option>
        </select>
      </div>

      {mode === "sequence" && (
        <>
          <div className="mb-4">
            <label className="mr-2 font-medium">Select Sample:</label>
            <select
              value={sequence}
              onChange={(e) => setSequence(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="Fall">Fall</option>
              <option value="Not Fall">Not Fall</option>
            </select>
          </div>
          <button
            onClick={handleSequenceAnalyze}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Analyze Sequence
          </button>
        </>
      )}

      {mode === "webcam" && (
        <div className="flex flex-col items-center">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="rounded shadow-lg mb-4"
          />
          <button
            onClick={captureSnapshot}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition mb-4"
          >
            Capture & Analyze
          </button>
          
          <div className="mt-4 p-4 bg-white rounded shadow-lg">
            <h3 className="text-lg font-semibold mb-3">Audio Analysis</h3>
            <AudioRecorder onStopCapture={handleAudioCapture} />
          </div>
        </div>
      )}

      {loading && <p className="mt-4 text-gray-700">Analyzing...</p>}

      {result && (
        <div className="mt-6 p-4 bg-white rounded shadow-md text-center">
          {result.error ? (
            <p className="text-red-500">{result.error}</p>
          ) : (
            <>
              <p className="text-lg font-semibold">Event: {result.event}</p>
              {result.confidence !== undefined && (
                <p className="text-gray-600">
                  Confidence: {Math.round(result.confidence * 100)}%
                </p>
              )}
              {result.frames_analyzed !== undefined && (
                <p className="text-gray-500 text-sm">
                  Frames Analyzed: {result.frames_analyzed}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* History View */}
      <div className="history mt-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-2">Incident History</h2>
        {history.map((h, idx) => (
          <div key={idx} className="mb-2 p-3 bg-white shadow rounded">
            <p><b>Time:</b> {new Date(h.timestamp).toLocaleString()}</p>
            <p><b>Source:</b> {h.source}</p>
            <p><b>Event:</b> {h.event}</p>
            <p><b>Confidence:</b> {Math.round(h.confidence * 100)}%</p>
          </div>
        ))}
      </div>

      {/* Report Summary */}
      {report && (
        <div className="mt-6 p-4 bg-yellow-100 rounded shadow text-center">
          <h2 className="text-lg font-semibold mb-2">Incident Summary</h2>
          {report.error ? (
            <p className="text-red-500">{report.error}</p>
          ) : (
            <>
              <p className="italic">{report.summary_text}</p>
              <button onClick={fetchReport} className="mt-3 px-4 py-2 bg-blue-500 text-white rounded">
                Refresh Report
              </button>
            </>
          )}
        </div>
      )}

      {/* Admin Controls - Only visible to admin role */}
      {role === "admin" && (
        <div className="admin-controls mt-6 p-4 bg-gray-200 rounded shadow w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">🔐 Admin Controls</h2>
          <div className="space-y-3">
            <button 
              onClick={clearIncidentLog}
              className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              🗑️ Clear Incident Log
            </button>
            <button 
              onClick={viewFullLogs}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
            >
              📋 View Full Logs
            </button>
            <button 
              onClick={fetchReport}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
            >
              📊 Generate Detailed Report
            </button>
            <div className="mt-4 p-3 bg-white rounded">
              <p className="text-sm text-gray-600">
                <strong>Admin Privileges:</strong>
              </p>
              <ul className="text-xs text-gray-500 mt-1 list-disc list-inside">
                <li>System maintenance and log management</li>
                <li>Full incident history access</li>
                <li>Detailed analytics and reporting</li>
                <li>Dataset management capabilities</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Role Information */}
      <div className="mt-4 p-3 bg-blue-50 rounded text-center text-sm text-gray-600">
        {role === "caregiver" ? (
          <p>👨‍⚕️ <strong>Caregiver Mode:</strong> Live monitoring and incident history access</p>
        ) : (
          <p>🔐 <strong>Admin Mode:</strong> Full system access with administrative controls</p>
        )}
      </div>
    </div>
  );
}

export default App;
