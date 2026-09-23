import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes';
import { initDailyTelegramBackupScheduler } from './server/telegram';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Routes FIRST before any frontend or asset handler
  app.use('/api', apiRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Explicit static file serving for public assets and screenshots (both dev and prod)
  app.use('/public', express.static(path.join(process.cwd(), 'public')));
  app.use('/screenshots', express.static(path.join(process.cwd(), 'public', 'screenshots')));

  // Vite middleware in development vs static dist in production
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`InvoiceKilat Server running at http://0.0.0.0:${PORT}`);
    // Boot daily automated Telegram backup scheduler
    initDailyTelegramBackupScheduler();
  });
}

startServer();
