/**
 * Email service stub — configure RESEND_API_KEY to send real emails.
 * In dev, logs the reset URL to console.error instead of sending.
 */
import { isRecord } from '@gzclp/shared/type-guards';

/** Sends a password reset email to the given address. */
export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  const apiKey = process.env['RESEND_API_KEY'];

  if (!apiKey) {
    // Development mode: print to stderr so it shows in server logs
    console.error(`[DEV] Password reset URL for ${email}: ${resetUrl}`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env['EMAIL_FROM'] ?? 'noreply@gzclp.app',
      to: email,
      subject: 'Reset your GZCLP Tracker password',
      html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    }),
  });

  if (!res.ok) {
    const err: unknown = await res.json().catch(() => ({}));
    const message = isRecord(err) ? JSON.stringify(err) : 'unknown error';
    throw new Error(`Email send failed: ${message}`);
  }
}
