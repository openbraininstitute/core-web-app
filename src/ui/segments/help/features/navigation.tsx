import Link from 'next/link';

import { RightOutlined } from '@ant-design/icons';

import { Button } from '@/ui/molecules/button';
import { getSearchParam, PageProps } from '@/utils/getSearchParams';

export default function FeaturesNavigation({ searchParams }: PageProps) {
  const scaleParams = getSearchParam(searchParams ?? {}, 'scale');

  const scalesList = [
    {
      name: 'Subcellular',
      id: 'subcellular',
    },
    {
      name: 'Cellular',
      id: 'cellular',
    },
    {
      name: 'Circuit',
      id: 'circuit',
    },
    {
      name: 'System',
      id: 'system',
    },
  ];

  return (
    <div className="col-span-1 flex flex-col gap-y-3">
      {scalesList.map((scale) => {
        const isActive = scaleParams === scale.id;

        const params = new URLSearchParams(scaleParams?.toString());
        params.set('section', 'features');
        params.set('scale', scale.id);
        const href = `?${params.toString()}`;

        return (
          <Button
            rounded
            borderless
            asChild
            key={`view-${scale.id}-features`}
            variant="outline"
            className={`shadow-base h-15 w-full justify-start px-6 text-lg font-semibold ${
              isActive ? 'bg-primary-9 text-white' : ''
            }`}
            aria-label={`View ${scale.name} features`}
          >
            <Link href={href} scroll={false}>
              {scale.name}
              <RightOutlined className="ml-auto text-current" />
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
