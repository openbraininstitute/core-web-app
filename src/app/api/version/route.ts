import { NextResponse } from 'next/server';

import { getVersionInfo } from '@/utils/version-info';

export function GET(req: Request) {
  const accept = req.headers.get('accept') || '';

  if (accept.includes('text/html')) {
    return NextResponse.redirect('/version');
  }

  return Response.json(getVersionInfo());
}
