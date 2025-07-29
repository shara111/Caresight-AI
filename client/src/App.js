import { useState } from "react";
import axios from "axios";

function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sequence, setSequence] = useState("Fall/F01"); // ⬅️ ADD THIS

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await axios.post("http://localhost:5050/api/analyze", {
        sequenceName: sequence, // ⬅️ SEND this in request body
      });
      setResult(res.data);
    } catch (err) {
      setResult({ error: "Failed to connect to backend" });
    }
    setLoading(false);
  };

  return (
    <div className='min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4'>
      <h1 className='text-3xl font-bold text-blue-600 mb-6'>
        CareSight AI Dashboard
      </h1>

      {/* Select sequence */}
      <div className='mb-4'>
        <label className='mr-2 font-medium'>Select Sample:</label>
        <select
          value={sequence}
          onChange={(e) => setSequence(e.target.value)}
          className='p-2 border rounded'
        >
          <option value='Fall'>Fall</option>
          <option value='Not Fall'>Not Fall</option>
        </select>
      </div>

      <button
        onClick={handleAnalyze}
        className='px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition'
      >
        Analyze for Fall
      </button>

      {loading && <p className='mt-4 text-gray-700'>Analyzing...</p>}

      {result && (
        <div className='mt-6 p-4 bg-white rounded shadow-md text-center'>
          {result.error ? (
            <p className='text-red-500'>{result.error}</p>
          ) : (
            <>
              <p className='text-lg font-semibold'>Event: {result.event}</p>
              <p className='text-gray-600'>
                Confidence: {Math.round(result.confidence * 100)}%
              </p>
              <p className='text-gray-500 text-sm'>
                Frames Analyzed: {result.frames_analyzed}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
