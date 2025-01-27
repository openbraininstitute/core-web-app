import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { notebookRepository } from '@/config';
import { options } from '@/util/virtual-lab/github';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const folder = searchParams.get('folder');

  if (!folder) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    const apiUrl = `https://api.github.com/repos/${notebookRepository.user}/${notebookRepository.repository}/contents/${folder}`;
    const response = await fetch(apiUrl, options);
    const data = await response.json();

    if (response.status !== 200) {
      return NextResponse.json(
        { error: data.message || 'Failed to fetch files from GitHub' },
        { status: 500 }
      );
    }

    const zip = new JSZip();

    for (const file of data) {
      if (file.type === 'file') {
        console.log(file);
        const fileData = await fetch(file.download_url, options);
        const arrayBuffer = await fileData.arrayBuffer();
        zip.file(file.name, arrayBuffer);
      }
    }

    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(zipContent, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${folder}.zip"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to zip files from GitHub' }, { status: 500 });
  }
}
