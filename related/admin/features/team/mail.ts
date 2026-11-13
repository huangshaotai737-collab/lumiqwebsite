import 'server-only';
import nodemailer from 'nodemailer';
import { HttpError } from '@/lib/http/result';
export function mailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.STAFF_INVITE_FROM,
  );
}
export async function sendStaffInvitation(email: string, link: string) {
  if (!mailConfigured()) throw new HttpError('UNAVAILABLE', 503);
  const port = Number(process.env.SMTP_PORT);
  const host = process.env.SMTP_HOST!;
  const local = host === '127.0.0.1' || host === 'localhost';
  if (
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    (!local && (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD))
  )
    throw new HttpError('UNAVAILABLE', 503);
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: !local && port !== 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    logger: false,
    debug: false,
  });
  try {
    const result = await transport.sendMail({
      from: process.env.STAFF_INVITE_FROM!,
      to: email,
      subject: 'LumiQ 員工邀請',
      text: `您收到 LumiQ 管理後臺的員工邀請。請使用此郵箱已確認的賬號登錄後接受邀請。鏈接在 48 小時內有效，僅可使用一次。\n\n${link}\n\n若您沒有賬號，請先在官網完成註冊和郵箱驗證。`,
    });
    if (!result.accepted?.length || result.rejected?.length)
      throw new Error('delivery rejected');
  } catch {
    throw new HttpError('UNAVAILABLE', 503);
  } finally {
    transport.close();
  }
}
