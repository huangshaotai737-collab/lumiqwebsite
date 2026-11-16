import { requireStaff } from '@/lib/auth/require-staff';
import { success, failure } from '@/lib/http/result';
export async function GET() {
  try { return success(await requireStaff(['admin','editor','operations'])); }
  catch (error) { return failure(error); }
}
