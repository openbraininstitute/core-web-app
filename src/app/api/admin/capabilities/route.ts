import { resolveCapabilities } from '@/admin/server/resolve';
import { auth } from '@/auth';

// An all-false record is a valid answer for a signed-in user, never a 403.
export async function GET() {
  const capabilities = await resolveCapabilities(await auth());
  if (!capabilities) {
    return Response.json({ error: 'unauthenticated' }, { status: 401 });
  }

  return Response.json(capabilities, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
