import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import apiApp from './server/app.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = 3000;

async function startServer() {
  const server = express();

  // Forward all /api/* requests to the Express backend app
  server.use((req: Request, res: Response, next) => {
    if (req.url.startsWith('/api')) {
      return apiApp(req, res, next);
    }
    next();
  });

  if (process.env.NODE_ENV === 'production') {
    server.use(express.static(path.resolve(__dirname, 'dist')));
    server.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    server.use(vite.middlewares);
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Planora server running on http://localhost:${port}`);
  });
}

startServer();
