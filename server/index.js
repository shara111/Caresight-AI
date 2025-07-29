const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.send('CareSight AI Backend Running');
});

// NEW: Route to forward request to Python AI model
app.post('/api/analyze', async (req, res) => {
  const { sequenceName } = req.body;
  try {
    const response = await axios.post('http://localhost:8000/api/analyze', { sequenceName });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch result from AI server' });
  }
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
