const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { calculateMetrics } = require('./utils/finance');
const { getAdvice } = require('./utils/ai');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// Serve frontend with no-cache headers so browser always gets latest version
app.use(express.static(path.join(__dirname, '../frontend'), {
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));

app.get("/", (req, res) => {
  res.send("Backend running");
});


app.post("/analyze", async (req, res) => {
  try {
    const data = req.body;

    const metrics = calculateMetrics(data);
    const advice = await getAdvice(data, metrics);

    res.json({
      success: true,
      metrics,
      advice
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Routes
const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const financeRoutes = require('./routes/finance');

app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/finance', financeRoutes);

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
