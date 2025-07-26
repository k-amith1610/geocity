const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// For now, let's create a simple WebSocket server without the complex Firebase integration
// We'll use a basic Socket.IO setup that works with the current setup
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Prepare the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize basic WebSocket server
  const io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  // Basic WebSocket event handlers
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // Handle report submission
    socket.on('report-submitted', (reportData) => {
      console.log('New report submitted:', reportData.id);
      // Broadcast to all other clients
      socket.broadcast.emit('reports-updated', {
        type: 'new-report',
        report: reportData
      });
    });

    // Handle report deletion
    socket.on('report-expired', (reportId) => {
      console.log('Report expired:', reportId);
      // Broadcast to all clients
      io.emit('reports-updated', {
        type: 'report-expired',
        reportId: reportId
      });
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log('> WebSocket server initialized');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
    });
  });
}); 