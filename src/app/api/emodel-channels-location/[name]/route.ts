import fs from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const filePath = path.join(process.cwd(), 'public', 'emodel-channels-location', `${name}.json`);

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const json = JSON.parse(fileContent);
    return NextResponse.json(json);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found', code: 'FileNotFound' }, { status: 404 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON', code: 'InvalidJson' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to read file', code: 'FailedToReadFile' },
      { status: 500 }
    );
  }
}
