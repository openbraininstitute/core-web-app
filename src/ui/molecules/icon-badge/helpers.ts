export const IconBadgeTone = {
  Project: 'project',
  Public: 'public',
  Neutral: 'neutral',
  Quiet: 'quiet',
} as const;
export type TIconBadgeTone = (typeof IconBadgeTone)[keyof typeof IconBadgeTone];

const TONES: ReadonlySet<string> = new Set(Object.values(IconBadgeTone));

export const isIconBadgeTone = (tone: string): tone is TIconBadgeTone => TONES.has(tone);
