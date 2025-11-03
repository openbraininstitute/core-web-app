'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { env } from '@/env';
import {
  COOKIE_MAX_AGE,
  defaultFlags,
  FEATURE_FLAGS_COOKIE,
  FeatureFlags,
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

export async function setFlag(key: keyof FeatureFlags, value: boolean) {
  const cookieStore = await cookies();
  const flags = await getAllFlags();

  cookieStore.set(FEATURE_FLAGS_COOKIE, JSON.stringify({ ...flags, [key]: value }), {
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: ['preview', 'development', 'staging', 'production'].includes(
      env.NEXT_PUBLIC_DEPLOYMENT_ENV
    ),
  });

  revalidatePath('/', 'layout');
}

export async function resetFlags() {
  const cookieStore = await cookies();
  cookieStore.delete(FEATURE_FLAGS_COOKIE);
  revalidatePath('/', 'layout');
}
