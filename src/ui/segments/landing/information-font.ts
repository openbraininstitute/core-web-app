import localFont from 'next/font/local';

/** The same self-hosted Titillium Web faces supplied with HexaTile Export V2. */
export const informationFont = localFont({
  src: [
    { path: './fonts/titillium-web-300.woff2', weight: '300', style: 'normal' },
    { path: './fonts/titillium-web-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/titillium-web-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-info-titillium',
  display: 'swap',
  fallback: ['Arial', 'sans-serif'],
});
