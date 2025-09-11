import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../lib/firebase';
const router = Router();
router.post('/login', async (req, res) => {
    try {
        const { username, password, recaptchaToken } = req.body || {};
        if (!username || !password)
            return res.status(400).json({ error: 'Missing credentials' });
        // Optional: verify reCAPTCHA server-side
        if (process.env.RECAPTCHA_SECRET_KEY) {
            if (!recaptchaToken)
                return res.status(400).json({ error: 'Missing reCAPTCHA token' });
            const verifyBody = `secret=${encodeURIComponent(process.env.RECAPTCHA_SECRET_KEY)}&response=${encodeURIComponent(recaptchaToken)}`;
            const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: verifyBody,
            });
            const verifyData = await verifyRes.json();
            if (!verifyData?.success)
                return res.status(400).json({ error: 'reCAPTCHA verification failed' });
        }
        const userSnap = await db.collection('users').where('email', '==', username).limit(1).get();
        const userDoc = userSnap.docs[0];
        const user = userDoc ? { id: userDoc.id, ...userDoc.data() } : null;
        if (!user)
            return res.status(401).json({ error: 'Invalid credentials' });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid)
            return res.status(401).json({ error: 'Invalid credentials' });
        if (user.role === 'admin') {
            await db.collection('activityLogs').add({
                type: 'Login',
                adminName: user.name || '',
                adminEmail: user.email,
                description: 'Admin logged in',
                createdAt: new Date(),
            });
        }
        return res.json({ message: 'Login successful', user: { id: user.id, email: user.email, role: user.role, name: user.name } });
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Login failed' });
    }
});
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, role } = req.body || {};
        if (!fullName || !email || !password || !role)
            return res.status(400).json({ error: 'All fields are required' });
        const normalizedRole = String(role).toLowerCase();
        const existingSnap = await db.collection('users').where('email', '==', email).limit(1).get();
        if (!existingSnap.empty)
            return res.status(409).json({ error: 'Email already registered' });
        const hashed = await bcrypt.hash(password, 10);
        await db.collection('users').add({
            name: fullName,
            email,
            password: hashed,
            role: normalizedRole,
            createdAt: new Date(),
        });
        return res.json({ message: 'Registration successful' });
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Registration failed' });
    }
});
export default router;
