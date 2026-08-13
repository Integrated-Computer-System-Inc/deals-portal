import express, { Request, Response } from 'express';
import cors from 'cors';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { processPendingEmails } from './cron/emailWorker';
import authRouter from './routes/auth';
import dealsRouter from './routes/deals';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// CORS — allow frontend origin
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health Check Route
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount API Routers
app.use('/api/auth', authRouter);
app.use('/api/deals', dealsRouter);

// Manual / Triggered Cron Worker Endpoint
app.post('/api/cron/email-worker', async (_req: Request, res: Response) => {
  try {
    const result = await processPendingEmails();
    res.json({
      message: 'Email worker execution completed',
      result,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Failed to process email batch', details: errorMsg });
  }
});

// Schedule Cron Execution every 1 minute
cron.schedule('* * * * *', async () => {
  console.log(`[Cron Job] Running email dispatcher cycle at ${new Date().toISOString()}...`);
  try {
    const result = await processPendingEmails();
    if (result.processedCount > 0) {
      console.log(`[Cron Job] Cycle complete. Processed: ${result.processedCount}, Success: ${result.successCount}, Failed: ${result.failureCount}`);
    }
  } catch (error) {
    console.error('[Cron Job] Error running email dispatcher:', error);
  }
});

app.listen(PORT, () => {
  console.log(`[Backend Service] Running on port ${PORT}`);
  console.log(`[Backend Service] API routes mounted: /api/auth, /api/deals`);
  console.log(`[Backend Service] Cron worker scheduled for pending email processing.`);
});
