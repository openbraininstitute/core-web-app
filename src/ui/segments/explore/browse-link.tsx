import { LoadingOutlined } from '@ant-design/icons';
import { usePathname, useSearchParams } from 'next/navigation';
import snakeCase from 'lodash/snakeCase';
import Link from 'next/link';

import { getEntityTypeFromUrl } from '@/ui/segments/explore/helpers';
import { Button } from '@/ui/molecules/button';

export function BrowseLink({
  isLoading,
  type,
  title,
  count,
  href,
}: {
  isLoading: boolean;
  type: string;
  title: string;
  count: number | null;
  href: string;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const entityType = snakeCase(getEntityTypeFromUrl(pathname) ?? '');
  return (
    <Button
      asChild
      rounded
      key={`counter-${type}`}
      variant="outline"
      size="lg"
      className="group w-full"
      active={entityType === type}
    >
      <Link
        href={{
          pathname: href,
          query: searchParams.toString(),
        }}
        className="flex! w-full items-center justify-between!"
      >
        <div className="font-bold text-current">{title}</div>
        <div className="text-neutral-4 text-sm font-light group-hover:font-bold group-hover:text-white">
          {isLoading ? <LoadingOutlined /> : <div>{count}</div>}
        </div>
      </Link>
    </Button>
  );
}
