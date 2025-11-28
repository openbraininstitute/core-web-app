import { NextResponse } from 'next/server';
import { getVersionInfo } from '@/utils/version-info';

export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  const accept = req.headers.get('accept') || '';

  if (accept.includes('text/html')) {
    const versionInfo = getVersionInfo();

    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head><title>Version Info</title></head>
<body style="display:flex;height:100vh;align-items:center;justify-content:center;margin:0">
  <div>
    <h1 style="font-size:1.5rem;font-weight:bold">Version Info</h1>
    <table style="margin-top:2rem;border-collapse:collapse;border:1px solid #d1d5db;background:white;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
      <tbody>
        ${Object.entries(versionInfo)
          .map(
            ([key, value], i) =>
              `<tr style="background:${i % 2 ? '#f9fafb' : 'white'}">
            <th style="border:1px solid #d1d5db;padding:0.5rem 1rem;text-align:left;font-weight:500">${key}</th>
            <td style="border:1px solid #d1d5db;padding:0.5rem 1rem">${value}</td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  return Response.json(getVersionInfo());
}
