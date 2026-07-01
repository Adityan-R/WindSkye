import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import searchRoutes from './routes/search.js';
import torrentRoutes from './routes/torrents.js';
import createRoutes from './routes/create.js';
import { torrentManager } from './torrentManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/search', searchRoutes);
app.use('/api/torrents', torrentRoutes);
app.use('/api/create', createRoutes);

// SSE endpoint for real-time torrent status updates
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Send initial status
  const sendStatus = () => {
    const status = torrentManager.getAllStatus();
    res.write(`data: ${JSON.stringify(status)}\n\n`);
  };

  sendStatus();
  const interval = setInterval(sendStatus, 1000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  ⚡ TorVault server running on http://localhost:${PORT}\n`);
});
