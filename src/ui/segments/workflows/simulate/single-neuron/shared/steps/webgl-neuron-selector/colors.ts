import { TgdColor } from '@tolokoban/tgd';

export function getColor(index: number) {
  const hue = ((index * 92) % 307) / 307;
  return TgdColor.fromHSL(hue, 0.9, 0.66).toString();
}
