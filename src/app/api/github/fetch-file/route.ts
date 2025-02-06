import { NextResponse } from 'next/server';
import { fetchGithubFile } from '@/util/virtual-lab/github';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  const file = await fetchGithubFile(path);

  return new NextResponse(file, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
