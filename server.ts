import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import app from "./api/index";

async function startServer() {
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const PORT = 3000;

  // Create uploads directory if it doesn't exist
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Socket.io for local dev
  io.on('connection', (socket) => {
    console.log('Client connected');
  });

  // Attach io to app for use in routes if needed (though current routes don't use it directly)
  // Actually, some routes in server.ts DID use io.emit. 
  // I need to make sure api/index.ts can use io if available.
  
  // Inject io into app locals
  app.set('io', io);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
