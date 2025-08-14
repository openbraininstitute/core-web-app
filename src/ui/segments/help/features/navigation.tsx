import { useRouter, useSearchParams } from 'next/navigation';

import { RightOutlined } from '@ant-design/icons';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';

export default function FeaturesNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const breakpoint = useDefaultBreakpoint();

  const currentScale = searchParams.get('scale');

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

  const handleClick = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('scale', id);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="col-span-1 flex flex-col gap-y-3">
      {scalesList.map((scale) => {
        const isActive = currentScale === scale.id;
        return (
          <Button
            rounded
            borderless
            asChild
            key={`view-${scale.id}-features`}
            variant="outline"
            className={`h-auto w-full justify-start font-bold shadow-sm ${
              isActive ? 'bg-primary-9 text-white' : ''
            }`}
            size={breakpoint === 'xl' ? 'lg' : 'md'}
            aria-label={`View ${scale.name} features`}
          >
            <button
              type="button"
              onClick={() => handleClick(scale.id)}
              aria-label={`View ${scale.name} features`}
            >
              {scale.name}
              <RightOutlined className="ml-auto text-current" />
            </button>
          </Button>
        );
      })}
    </div>
  );
}
