'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import { cn } from '@/utils/css-class';

const SCALES = [
  { name: 'Subcellular', id: 'subcellular' },
  { name: 'Cellular', id: 'cellular' },
  { name: 'Circuit', id: 'circuit' },
];

export default function FeaturesNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeScale = searchParams.get('scale');

  return (
    <div className="flex w-full flex-col gap-y-6">
      <div className="flex flex-col gap-y-2">
        <h3 className="text-primary-9 text-xs font-bold tracking-wide uppercase">Scale</h3>
        <div className="flex flex-col gap-y-1.5">
          {SCALES.map((scale) => {
            const isActive = activeScale === scale.id;
            return (
              <button
                type="button"
                key={scale.id}
                aria-label={`View ${scale.name} features`}
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('scale', scale.id);
                  router.replace(`${url.pathname}${url.search}`, { scroll: false });
                }}
                className={cn(
                  'text-primary-9 flex w-full items-center justify-between text-left text-sm',
                  isActive && 'font-bold'
                )}
              >
                {scale.name}
                {isActive && <span className="bg-primary-9 h-2 w-2 rounded-full" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
