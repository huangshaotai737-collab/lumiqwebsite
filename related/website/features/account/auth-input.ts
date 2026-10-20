import { HttpError } from '@/lib/http/result';
export function authInput(input: unknown, password = false) {
    if (!input || typeof input !== 'object')
        throw new HttpError('INVALID_INPUT', 400);
    const v = input as Record<string, unknown>;
    if (typeof v.email !== 'string' || v.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email))
        throw new HttpError('INVALID_INPUT', 400);
    if (password && (typeof v.password !== 'string' || v.password.length < 8 || v.password.length > 1024))
        throw new HttpError('INVALID_INPUT', 400);
    return { email: v.email, password: v.password as string, locale: ['en', 'zh-hant', 'ja'].includes(v.locale as string) ? v.locale as string : 'en', next: v.next };
}
export async function jsonInput(request: Request) { try {
    return await request.json();
}
catch {
    throw new HttpError('INVALID_INPUT', 400);
} }
export function mailError(error: {
    status?: number;
    name?: string;
} | null) { if (error && ((error.status || 0) >= 500 || error.name === 'AuthRetryableFetchError'))
    throw new HttpError('UNAVAILABLE', 503); if (error?.status === 429)
    throw new HttpError('RATE_LIMITED', 429); }
