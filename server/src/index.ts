import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import diagnoseRouter from './routes/diagnose';
import projectRouter from './routes/project';


if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY is not set in environment variables.');
  process.exit(1);
}

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'DI-MY API', timestamp: new Date().toISOString() });
});

app.use('/api/diagnose', diagnoseRouter);
app.use('/api/project', projectRouter);

// Body-parser oversize errors return JSON so the client gets a 413, not a connection reset
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = (err as { status?: number; statusCode?: number }).status
    ?? (err as { status?: number; statusCode?: number }).statusCode
    ?? 500;

  if (status === 413) {
    res.status(413).json({
      error: 'Your photos are too large to upload. Try fewer images or use lower-resolution photos.',
    });
    return;
  }

  console.error('[server] Unhandled error:', err);
  res.status(status).json({ error: 'An unexpected server error occurred. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`DI-MY server running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
