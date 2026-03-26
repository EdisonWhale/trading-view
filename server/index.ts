import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import sessionsRouter, { fillRouter, tradeRouter } from './routes/sessions.js';
import analyticsRouter from './routes/analytics.js';

const app = express();
const PORT = Number(process.env.PORT ?? 3002);
const AUTH_COOKIE_NAME = 'review_auth';
const AUTH_PASSWORD = process.env.REVIEW_APP_PASSWORD ?? '';
const AUTH_SECRET = process.env.REVIEW_APP_AUTH_SECRET ?? crypto.randomBytes(32).toString('hex');
const AUTH_ENABLED = process.env.NODE_ENV !== 'test';
const STATIC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');

function parseCookies(cookieHeader?: string) {
  if (!cookieHeader) {
    return new Map<string, string>();
  }

  return new Map(
    cookieHeader
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separator = entry.indexOf('=');
        if (separator === -1) {
          return [entry, ''] as const;
        }

        const key = entry.slice(0, separator).trim();
        const value = decodeURIComponent(entry.slice(separator + 1).trim());
        return [key, value] as const;
      }),
  );
}

function createAuthToken() {
  return crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`review:${AUTH_PASSWORD}`)
    .digest('hex');
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isAuthenticated(req: express.Request) {
  if (!AUTH_ENABLED) {
    return true;
  }

  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.get(AUTH_COOKIE_NAME);
  return typeof token === 'string' && safeEqual(token, createAuthToken());
}

function setAuthCookie(res: express.Response) {
  res.setHeader('Set-Cookie', [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(createAuthToken())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
  ]);
}

function clearAuthCookie(res: express.Response) {
  res.setHeader('Set-Cookie', [
    `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  ]);
}

function authStatus(_req: express.Request, res: express.Response) {
  res.json({ authenticated: isAuthenticated(_req) });
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/api/auth/session', authStatus);
app.post('/api/auth/login', (req, res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!safeEqual(password, AUTH_PASSWORD)) {
    clearAuthCookie(res);
    res.status(401).json({ authenticated: false, error: '密码错误' });
    return;
  }

  setAuthCookie(res);
  res.json({ authenticated: true });
});
app.post('/api/auth/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ authenticated: false });
});
app.use('/api', (req, res, next) => {
  if (!AUTH_ENABLED || req.path.startsWith('/auth/') || req.path === '/health') {
    next();
    return;
  }

  if (!isAuthenticated(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
});
app.use('/api/sessions', sessionsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/trades', tradeRouter);
app.use('/api/fills', fillRouter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (fs.existsSync(STATIC_ROOT)) {
  app.use(express.static(STATIC_ROOT));

  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }

    res.sendFile(path.join(STATIC_ROOT, 'index.html'));
  });
}

// ─── 404 fallback ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[unhandled error]', err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ error: message });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Check your PORT setting or stop the existing process before starting this server again.`);
    process.exit(1);
  }

  console.error('[server error]', error);
  process.exit(1);
});

export default app;
