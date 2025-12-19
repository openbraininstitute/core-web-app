'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { config } from '@/config';

import {
  COOKIE_MAX_AGE,
  defaultFlags,
  FEATURE_FLAGS_COOKIE,
  type FeatureFlags,
} from '@/features/feature-flags/config';

export async function getAllFlags(): Promise<FeatureFlags> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(FEATURE_FLAGS_COOKIE);

  if (!cookie?.value) return { ...defaultFlags };

  try {
    return { ...defaultFlags, ...JSON.parse(cookie.value) };
  } catch {
    return { ...defaultFlags };
  }
}

export async function setFlag<K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]) {
  const cookieStore = await cookies();
  const flags = await getAllFlags();

  cookieStore.set(FEATURE_FLAGS_COOKIE, JSON.stringify({ ...flags, [key]: value }), {
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: ['preview', 'development', 'staging', 'production'].includes(config.DEPLOYMENT_ENV),
  });

  revalidatePath('/', 'layout');
}

export async function resetFlags() {
  const cookieStore = await cookies();
  cookieStore.delete(FEATURE_FLAGS_COOKIE);
  revalidatePath('/', 'layout');
}
