'use server';

import { cookies } from 'next/headers';

import {
  LEARN_SETTINGS_COOKIE,
  type LearnSettings,
  parseLearnSettings,
} from '@/features/learn/learn-settings';

/** Learn's settings, from their cookie: what the server renders with. The browser writes it. */
export async function getLearnSettings(): Promise<LearnSettings> {
  const cookieStore = await cookies();
  return parseLearnSettings(cookieStore.get(LEARN_SETTINGS_COOKIE)?.value);
}
