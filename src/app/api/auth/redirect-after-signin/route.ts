import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const RETURN_TO_COOKIE = 'preview-return-to';

export async function GET() {
  const cookieStore = await cookies();
  const returnTo = cookieStore.get(RETURN_TO_COOKIE)?.value;

  if (returnTo && isValidPreviewDomain(returnTo)) {
    const response = NextResponse.redirect(returnTo);
    response.cookies.delete(RETURN_TO_COOKIE);
    return response;
  }

  return NextResponse.redirect(new URL('/app', returnTo || 'https://openbluebrain.com'));
}

function isValidPreviewDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('.preview.openbraininstitute.org');
  } catch {
    return false;
  }
}
