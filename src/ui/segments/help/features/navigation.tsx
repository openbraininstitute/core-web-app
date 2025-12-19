'use client';

import { RightOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';
import { buildLink } from '@/utils/searchparams-to-link';

export default function FeaturesNavigation() {
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
  ];

  const searchParams = useSearchParams();
  const searchParamsObj = Object.fromEntries(searchParams.entries());

  const activeScale = searchParams.get('scale') ?? 'subcellular'; // Default to 'subcellular'

  return (
    <div className="col-span-1 flex flex-col gap-y-3">
      {scalesList.map((scale) => {
        const link = buildLink(searchParamsObj, { scale: scale.id });
        const isActive = activeScale === scale.id;

        return (
          <Button
            rounded
            borderless
            asChild
            key={`view-${scale.id}-features`}
            variant="outline"
            className={cn(
              'shadow-base h-15 w-full justify-start px-6 text-lg font-semibold',
              isActive ? 'bg-primary-9 text-white' : '',
            )}
            aria-label={`View ${scale.name} features`}
          >
            <Link href={link.href} scroll={false}>
              {scale.name}
              <RightOutlined className="ml-auto text-current" />
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
