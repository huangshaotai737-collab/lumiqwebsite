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
      subject: 'LumiQ 员工邀请',
      text: `您收到 LumiQ 管理后台的员工邀请。请使用此邮箱已确认的账号登录后接受邀请。链接在 48 小时内有效，仅可使用一次。\n\n${link}\n\n若您没有账号，请先在官网完成注册和邮箱验证。`,
    });
    if (!result.accepted?.length || result.rejected?.length)
      throw new Error('delivery rejected');
  } catch {
    throw new HttpError('UNAVAILABLE', 503);
  } finally {
    transport.close();
  }
}
