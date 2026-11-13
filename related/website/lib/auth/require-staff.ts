import type { StaffRole, UUID } from '../generated/platform/core';
import { authorizeStaff } from '../generated/platform/auth-policy';
import { createClient } from './server';
import { HttpError } from '../http/result';
export async function requireStaff(allowed: readonly StaffRole[]): Promise<{userId: UUID; role: StaffRole}> {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error && ((error.status || 0) >= 500 || error.name === 'AuthRetryableFetchError')) throw new HttpError('UNAVAILABLE',503);
  if (error || !user || user.is_anonymous) throw new HttpError('UNAUTHENTICATED', 401);
  const [profile, staff] = await Promise.all([
    client.from('profiles').select('access_state').eq('user_id',user.id).maybeSingle(),
    client.from('staff_memberships').select('role,active').eq('user_id',user.id).maybeSingle(),
  ]);
  if (profile.error || staff.error) throw new HttpError('UNAVAILABLE', 503);
  return authorizeStaff(user.id, profile.data, staff.data, allowed);
}
