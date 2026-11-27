// Bake the landing shadows once: Safari does not enable CanvasRenderingContext2D.filter.
// Run from the repository root with: node scripts/website/generate-tile-shadows.mjs
import fs from 'node:fs/promises';

import sharp from 'sharp';

const radius = 100;
const levels = [2, 4, 7, 11, 16, 23, 32, 44];
let width = 0;
const sprites = await Promise.all(
  levels.map(async (blur) => {
    const size = 2 * (radius + Math.ceil(blur * 3));
    const left = width;
    width += size;
    const points = Array.from({ length: 6 }, (_, k) => {
      const angle = -Math.PI / 2 + (k * Math.PI) / 3;
      return `${size / 2 + radius * Math.cos(angle)},${size / 2 + radius * Math.sin(angle)}`;
    }).join(' ');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><polygon points="${points}" fill="rgb(70,80,100)"/></svg>`;
    const input = await sharp(Buffer.from(svg)).blur(blur).png().toBuffer();
    return { input, left, top: 0, size };
  })
);
const directory = 'public/static/landing-v1/shadows';
await fs.mkdir(directory, { recursive: true });
const { data, info } = await sharp({
  create: {
    width,
    height: Math.max(...sprites.map((s) => s.size)),
    channels: 4,
    background: '#00000000',
  },
})
  .composite(sprites.map(({ input, left, top }) => ({ input, left, top })))
  .raw()
  .toBuffer({ resolveWithObject: true });
// Shadows use one ink colour; only opacity changes. Avoid RGB rounding noise from blur.
for (let i = 0; i < data.length; i += 4) {
  data[i] = 70;
  data[i + 1] = 80;
  data[i + 2] = 100;
}
await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .webp({ lossless: true, effort: 6 })
  .toFile(`${directory}/tile-shadows-v1.webp`);
