import { requireStaff } from '@/lib/auth/require-staff';
import { configurationStatus } from '@/features/team/service';
import { failure, success } from '@/lib/http/result';
export async function GET() {
  try {
    await requireStaff(['admin']);
    return success({ configuration: configurationStatus() });
  } catch (error) {
    return failure(error);
  }
}
