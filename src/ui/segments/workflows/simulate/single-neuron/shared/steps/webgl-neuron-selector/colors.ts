import { TgdColor } from '@tolokoban/tgd';

export function getColorFromGeneratedPalette(
  index: number,
  { saturation = 0.9, luminance = 0.66 }: Partial<{ saturation: number; luminance: number }> = {}
) {
  const start = 0.3333; // green
  const hue = start + ((index * 92) % 307) / 307;
  return TgdColor.fromHSL(hue, saturation, luminance).toString();
}
