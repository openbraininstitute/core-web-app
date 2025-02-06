import { NextResponse } from 'next/server';
import { fetchFile } from '@/util/virtual-lab/github';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  const file = await fetchFile(path);

  return new NextResponse(file, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
