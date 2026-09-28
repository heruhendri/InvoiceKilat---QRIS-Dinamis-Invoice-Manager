import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes';
import { initDailyTelegramBackupScheduler } from './server/telegram';

process.on('uncaughtException', (err) => {
  console.error('[Process Uncaught Exception]:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Process Unhandled Rejection]:', reason);
});

async function startServer() {
  const app = express();

  // Custom port support: CLI flag (--port / -p), process.env.PORT, or fallback to 3000
  let cliPort: number | undefined;
  const portArgIndex = process.argv.findIndex(arg => arg === '--port' || arg === '-p');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    cliPort = parseInt(process.argv[portArgIndex + 1], 10);
  } else {
    const inlinePortArg = process.argv.find(arg => arg.startsWith('--port='));
    if (inlinePortArg) {
      cliPort = parseInt(inlinePortArg.split('=')[1], 10);
    }
  }

  const PORT = (!isNaN(Number(cliPort)) && Number(cliPort) > 0)
    ? Number(cliPort)
    : (process.env.PORT && !isNaN(Number(process.env.PORT)) && Number(process.env.PORT) > 0)
      ? parseInt(process.env.PORT, 10)
      : 3000;

  // Middleware for body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Routes FIRST before any frontend or asset handler
  app.use('/api', apiRouter);

  // Direct Mikhmon Webserver Portal Route
  app.get('/mikhmon/portal/:id', (req, res, next) => {
    req.url = `/mikhmon/portal/${req.params.id}`;
    return apiRouter(req, res, next);
  });

  // Health check - immediately available for instant readiness
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Explicit static file serving for public assets and screenshots (both dev and prod)
  app.use('/public', express.static(path.join(process.cwd(), 'public')));
  app.use('/screenshots', express.static(path.join(process.cwd(), 'public', 'screenshots')));

  // Vite middleware in development vs static dist in production
  if (process.env.NODE_ENV !== 'production') {
    let viteMiddleware: express.RequestHandler | null = null;
    const vitePromise = createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    }).then((vite) => {
      viteMiddleware = vite.middlewares;
      console.log('⚡ Vite dev server initialized');
      return vite;
    }).catch((err) => {
      console.error('❌ Failed to create Vite dev server:', err);
      throw err;
    });

    app.use(async (req, res, next) => {
      if (viteMiddleware) {
        return viteMiddleware(req, res, next);
      }
      try {
        await vitePromise;
        if (viteMiddleware) {
          return viteMiddleware(req, res, next);
        }
      } catch (err) {
        return next(err);
      }
      next();
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`InvoiceKilat Server running at http://0.0.0.0:${PORT}`);
    // Boot daily automated Telegram backup scheduler
    initDailyTelegramBackupScheduler();
  });

  const shutdown = () => {
    server.close(() => {
      console.log('Server gracefully stopped');
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
