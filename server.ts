import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import { WebSocketServer } from "ws";
import url from "url";
import path from "path";
import fs from "fs";
import app from "./api/server";

async function startServer() {
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const wss = new WebSocketServer({ noServer: true });
  const PORT = 3000;

  // Handle standard WebSocket upgrade for specific paths
  httpServer.on('upgrade', (request, socket, head) => {
    const { pathname } = url.parse(request.url || '');

    if (pathname === '/inventory/low-stock') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    console.log('Low stock WebSocket client connected');
    ws.on('close', () => console.log('Low stock WebSocket client disconnected'));
  });

  // Create uploads directory if it doesn't exist
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Socket.io for local dev
  io.on('connection', (socket) => {
    console.log('Client connected');
  });

  // Inject servers into app locals for use in routes
  app.set('io', io);
  app.set('wss', wss);

  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);

  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite middleware...");
    const vite = await createViteServer({ 
      server: { middlewareMode: true }, 
      appType: "spa" 
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    console.log(`Serving static files from ${distPath}`);
    
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('Production build found but index.html missing in dist/');
        }
      });
    } else {
      console.warn("Dist directory missing. Falling back to source (Warning: This will cause MIME errors in production environment!)");
      app.use(express.static(path.join(process.cwd())));
      app.get('*', (req, res) => res.sendFile(path.join(process.cwd(), 'index.html')));
    }
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
