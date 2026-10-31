import { useSession } from '@/features/auth/client';

export function useAccessToken(): string | undefined {
  const { data: session } = useSession();
  return session?.accessToken;
}
