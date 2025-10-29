import nodemailer from 'nodemailer';

type SendMailOptions = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
};

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (cachedTransporter) return cachedTransporter;
  const port = Number(process.env.EMAIL_PORT || 465);
  cachedTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
  // Optional connection verification on cold start for debugging
  if (process.env.EMAIL_DEBUG === 'true') {
    cachedTransporter.verify().then(() => {
      console.log('[mailer] SMTP connection verified');
    }).catch((err) => {
      console.error('[mailer] SMTP verify failed:', err);
    });
  }
  return cachedTransporter;
}

export async function sendMail(options: SendMailOptions) {
  const transporter = getTransporter();
  const from = options.from || process.env.EMAIL_USER || '';
  if (process.env.EMAIL_DEBUG === 'true') {
    console.log('[mailer] Sending email', { to: options.to, subject: options.subject, from });
  }
  return transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}


