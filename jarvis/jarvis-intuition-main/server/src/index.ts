import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createServer } from 'http';
import { setupWebSocket, sendToTab } from './websocket.js';
import { transcribeAudio } from './transcribe.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Multer for audio upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Audio transcription endpoint
app.post('/api/audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const tabId = parseInt(req.body.tabId) || 0;

    console.log('[API] Audio received:', req.file.size, 'bytes, mime:', req.file.mimetype, 'tabId:', tabId);

    const transcript = await transcribeAudio(req.file.buffer, req.file.mimetype);
    
    console.log('[API] Transcript:', transcript);

    // Send transcript to WebSocket handler for status update (best-effort)
    if (tabId) {
      sendToTab(tabId, {
        type: 'status_update',
        tabId,
        data: { status: 'thinking' }
      });
    }

    // The WebSocket will handle the rest via user_transcript message
    // But we also return the transcript for immediate UI update
    res.json({ transcript, tabId });

  } catch (error) {
    console.error('[API] Transcription error:', error);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

// Create HTTP server
const server = createServer(app);

// Setup WebSocket
setupWebSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🎙️  Voice Assistant Server Running                         ║
║                                                              ║
║   HTTP:      http://localhost:${PORT}                          ║
║   WebSocket: ws://localhost:${PORT}/ws                         ║
║                                                              ║
║   Endpoints:                                                 ║
║   • GET  /api/health    - Health check                       ║
║   • POST /api/audio     - Audio transcription                ║
║                                                              ║
║   Make sure OPENAI_API_KEY is set in environment             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  server.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});
