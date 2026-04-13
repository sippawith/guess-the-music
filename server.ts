import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { registerRoutes } from './server/routes';
import { registerGameHandlers } from './server/game';

dotenv.config();

const app = express();
const server = http.createServer(app);
const allowedOrigin = process.env.APP_URL || 'http://localhost:3000';

const io = new Server(server, {
  cors: {
    origin: [allowedOrigin],
    methods: ['GET', 'POST']
  }
});

const PORT = 3000;

app.use(express.json());
registerRoutes(app);
registerGameHandlers(io);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Allowed CORS origin: ${allowedOrigin}`);
  });
}

startServer();
