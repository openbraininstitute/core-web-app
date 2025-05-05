import fs from 'fs/promises';
import path from 'path';

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'circuits', 'ALL_CIRCUITS.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContents);

    let circuits: any[] = [];
    if (Array.isArray(data)) {
      circuits = data;
    } else if (data && typeof data === 'object' && Array.isArray(data.circuits)) {
      circuits = data.circuits;
    } else {
      throw new Error('Invalid data format: Expected an array or object with circuits array');
    }

    return NextResponse.json({ circuits });
  } catch (error) {
    throw new Error(`Failed to load ALL_CIRCUITS.json: ${error}`);
    return NextResponse.json(
      { error: 'Failed to load circuits data', circuits: [] },
      { status: 500 }
    );
  }
}
