import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import applicationRouter from './routes/application';
import bikesRouter from './routes/bikes';
import dashboardRouter from './routes/dashboard';
import leaderboardRouter from './routes/leaderboard';
import myBikeRouter from './routes/myBike';
import adminSplitRouter from './routes/admin/index';
import uploadRouter from './routes/upload';

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);
app.use('/applications', applicationRouter);
app.use('/bikes', bikesRouter);
app.use('/dashboard', dashboardRouter);
app.use('/leaderboard', leaderboardRouter);
app.use('/my-bike', myBikeRouter);
app.use('/admin', adminSplitRouter);
app.use('/upload-profile-photo', uploadRouter);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`[backend] listening on http://localhost:${port}`);
});


