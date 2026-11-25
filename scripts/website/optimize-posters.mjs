// Run after optimize-media.py. Keep source posters intact for future exports.

import crypto from 'node:crypto';
import fs from 'node:fs/promises';

import sharp from 'sharp';

const manifestPath = 'src/ui/segments/landing/optimized-media.json';
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
for (const source of Object.keys(manifest)) {
  const poster = source.replace(
    /\.mp4$/,
    source.endsWith('/education.mp4') ? '-poster.jpg' : '.jpg'
  );
  const input = await fs.readFile(`public${poster}`);
  const buffer = await sharp(input).webp({ quality: 90 }).toBuffer();
  const digest = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 12);
  const name = poster
    .split('/')
    .pop()
    .replace(/\.jpg$/, `-${digest}.webp`);
  const src = `/static/website-optimized/${name}`;
  await fs.writeFile(`public${src}`, buffer);
  manifest[poster] = { poster: { src, bytes: buffer.length, originalBytes: input.length } };
}
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
