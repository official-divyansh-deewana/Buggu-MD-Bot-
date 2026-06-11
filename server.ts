import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { router as apiRouter } from './src/routes/api';
import { connectToWhatsApp } from './src/lib/baileys';
import dotenv from 'dotenv';

dotenv.config();

// Protect Node process from unexpected third-party WebSocket or async library crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[SERVER CRITICAL] Uncaught Exception thrown:', err);
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS headers for separate frontend deployments (e.g. Vercel)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // JSON parsing and static assets configuration
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static public folder if it exists as per folders requirement
  const publicDir = path.join(process.cwd(), 'public');
  app.use('/public', express.static(publicDir));

  // Mount API paths first
  app.use('/api', apiRouter);

  // Initialize and auto-connect the WhatsApp socket client in the background on boot
  console.log('[SERVER] Booting WhatsApp BUGGU MD Bot client...');
  connectToWhatsApp().catch((err) => {
    console.error('[SERVER ERR] Failed to auto-start WhatsApp client on boot:', err);
  });

  // Vite middleware setup for Development vs Production
  if (process.env.NODE_ENV !== 'production') {
    console.log('[SERVER] Development mode: Mounting Vite live middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[SERVER] Production mode: Serving static files from dist...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 BUGGU MD Web Dashboard running on: http://0.0.0.0:${PORT}`);
    console.log(`🌐 Local interface available at Port: ${PORT}`);
    console.log(`=======================================================`);
  });
}

startServer();
