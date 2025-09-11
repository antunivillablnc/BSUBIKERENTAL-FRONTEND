import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import applicationRouter from './routes/application';
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
const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
    console.log(`[backend] listening on http://localhost:${port}`);
});
