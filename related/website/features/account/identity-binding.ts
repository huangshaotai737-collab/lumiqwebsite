import {HttpError} from '@/lib/http/result';
/** A binding restricts the verified cookie actor. It never selects an account. */
export function assertAccountBinding(input: unknown, userId: string): void {
  const expected = input && typeof input === 'object' ? (input as Record<string,unknown>).expectedUserId : undefined;
  if(typeof expected !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(expected)) throw new HttpError('INVALID_INPUT',400);
  if(expected !== userId) throw new HttpError('FORBIDDEN',403);
}
