import { usePathname as useNextPathname } from 'next/navigation';

import { config } from '@/config';

export default function usePathname() {
  const nextPathname = useNextPathname();

  const { BASE_PATH } = config;

  return BASE_PATH ? nextPathname?.replace(BASE_PATH, '') : nextPathname;
}
