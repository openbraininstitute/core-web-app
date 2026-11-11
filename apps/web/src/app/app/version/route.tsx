import { NextResponse } from 'next/server';

import { getVersionInfo } from '@/utils/version-info';

export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  const accept = req.headers.get('accept') || '';

  const versionInfo = getVersionInfo();

  if (!accept.includes('text/html')) {
    return Response.json(versionInfo);
  }

  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Core web app version info</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #003a8c;
            display: flex;
            min-height: 100vh;
            align-items: center;
            justify-content: center;
            padding: 2rem;
          }
          .container {
            background: white;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            overflow: hidden;
            max-width: 640px;
            width: 100%;
          }
          h3 {
            background: #f5f5f5;
            color: #002766;
            padding: 1.5rem 2rem;
            font-size: 1.5rem;
            font-weight: 600;
            letter-spacing: 0.5px;
          }
          table { width: 100%; }
          tr { transition: background 0.15s; }
          tr:hover { background: #f8fafc !important; }
          th {
            padding: 1rem 2rem;
            text-align: left;
            font-weight: 600;
            color: #002766;
            border-bottom: 1px solid #e2e8f0;
            width: 40%;
          }
          td {
            padding: 1rem 2rem;
            color: #003a8c;
            border-bottom: 1px solid #e2e8f0;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
          }
          tr:last-child th,
          tr:last-child td { border-bottom: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <h3>Version info</h3>
          <table>
            <tbody>
              ${Object.entries(versionInfo)
                .map(
                  ([key, value]) =>
                    `<tr>
                  <th>${key}</th>
                  <td>${value}</td>
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
