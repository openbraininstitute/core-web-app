import { useAuthSession } from '@/features/auth/client';

export function useAccessToken(): string | undefined {
  const { data: session } = useAuthSession();
  return session?.accessToken;
}
