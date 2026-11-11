'use client';

import { usePathname } from 'next/navigation';

import { LeftMenu } from './left-nav-menu';
import { OBIShowcaseLeftMenu } from './obi-showcases/left-nav-menu';

type Props = {
  className?: string;
};

export function ConditionalLeftMenu({ className }: Props) {
  const pathname = usePathname();

  // Check if we're on an obi-showcase detail page
  const isOBIShowcaseDetailPage =
    pathname.includes('/reports/obi-showcase/') && pathname.split('/').length > 6; // Has a slug after obi-showcase

  if (isOBIShowcaseDetailPage) {
    return <OBIShowcaseLeftMenu className={className} />;
  }

  return <LeftMenu className={className} />;
}

export default ConditionalLeftMenu;
