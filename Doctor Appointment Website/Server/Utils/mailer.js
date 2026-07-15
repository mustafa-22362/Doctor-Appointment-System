import nodemailer from 'nodemailer';

// Fill these values with your SMTP or service credentials
// Option A: Use a well-known service (recommended for Gmail/Outlook)
//   - set useService: true
//   - service: 'gmail' | 'hotmail' | 'outlook' | 'yahoo' | etc.
// Option B: Use a custom SMTP server
//   - set useService: false
//   - provide host, port, secure

export const MAIL_CONFIG = {
  useService: true,
  service: 'gmail',
  host: '', // e.g., 'smtp.gmail.com' (leave empty if useService = true)
  port: 587, // 465 for secure, 587 for TLS
  secure: false, // true for 465, false for others
  auth: {
    user: 'abdulhaseeb9907@gmail.com',
    pass: 'rigl yiun kmll iqed '
  },
  from: 'Health Ways Hospital <abdulhaseeb9907@gmail.com>'
};

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const { useService, service, host, port, secure, auth } = MAIL_CONFIG;

  if (auth?.user && auth?.pass && (useService ? service : host)) {
    transporter = nodemailer.createTransport(
      useService
        ? { service, auth }
        : { host, port, secure, auth }
    );
  } else {
    // Fallback: JSON transport (logs the email instead of sending)
    transporter = nodemailer.createTransport({ jsonTransport: true });
    console.warn('[mailer] Using JSON transport. Fill MAIL_CONFIG to send real emails.');
  }
  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter();
  const from = MAIL_CONFIG.from || MAIL_CONFIG.auth?.user || 'no-reply@healthways.local';
  const mailOptions = { from, to, subject, html, text };
  try {
    const info = await t.sendMail(mailOptions);
    return { success: true, info };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
}

export default { sendEmail, MAIL_CONFIG };


