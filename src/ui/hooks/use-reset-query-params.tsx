import { useRouter, usePathname } from 'next/navigation';

export function useResetQueryParams() {
  const router = useRouter();
  const pathname = usePathname();

  const reset = () => {
    router.replace(pathname);
  };

  return reset;
}
