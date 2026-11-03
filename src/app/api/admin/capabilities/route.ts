import { resolveCapabilities } from '@/admin/server/resolve';
import { auth } from '@/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// An all-false record is a valid answer for a signed-in user, never a 403.
export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const capabilities = await resolveCapabilities(session);
  return Response.json(capabilities, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
