import { NextResponse } from 'next/server';
import { downloadZippedFolder } from '@/util/virtual-lab/github';
import { assertErrorMessage } from '@/util/utils';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const folder = searchParams.get('folder');

  if (!folder) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    const zipContent = await downloadZippedFolder(folder);

    return new NextResponse(zipContent, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${folder}.zip"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: assertErrorMessage(error) }, { status: 500 });
  }
}
