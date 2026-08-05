const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const { initDb } = require('./src/database/db');
const apiRoutes = require('./src/routes/apiRoutes');

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Attach Socket.IO to Express app and global context for access inside controllers and timers
app.set('socketio', io);
global.io = io;

const path = require('path');
const fs = require('fs');

// Mount API routes
app.use('/api', apiRoutes);

// Root health check route
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', system: 'KANDRIX AI Attendance System Backend API', timestamp: new Date() });
});

// Serve frontend static build assets if available
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Socket.IO real-time connection events
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`[Socket.IO] Socket ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Global Express Error Protection Middleware
app.use((err, req, res, next) => {
  console.error('[EXPRESS ERROR HANDLER]:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message || 'Unknown error'
  });
});

// Process-level uncaught exception & unhandled rejection safety guards
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 KANDRIX AI Attendance System Backend API Server running on port ${PORT}`);
  console.log(`⚡ Socket.IO Real-time Engine active on all network interfaces`);
  console.log(`====================================================`);
});

// Initialize Database in background (non-blocking for Render health checks)
initDb()
  .then(() => {
    console.log('✅ Database initialization complete.');
  })
  .catch((err) => {
    console.error('⚠️ Database initialization warning:', err);
  });
