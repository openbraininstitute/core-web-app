import { useRouter, useSearchParams } from 'next/navigation';

import { RightOutlined } from '@ant-design/icons';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';

export type AboutNavigationProps = {
  id: string;
  name: string;
};

export default function AboutNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const breakpoint = useDefaultBreakpoint();

  const handleClick = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('about', id);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const content: AboutNavigationProps[] = [
    {
      name: 'About',
      id: 'about',
    },
    {
      name: 'Terms and condition',
      id: 'terms-and-conditions',
    },
    {
      name: 'About the app',
      id: 'about-the-app',
    },
  ];

  return (
    <div className="col-span-1 flex max-h-[82vh] w-full flex-col gap-y-4 overflow-y-scroll">
      {content?.map((section: AboutNavigationProps) => (
        <Button
          rounded
          borderless
          asChild
          key={`view-${section.id}-features`}
          variant="outline"
          className="h-auto w-full justify-start font-bold shadow-sm"
          size={breakpoint === 'xl' ? 'lg' : 'md'}
          aria-label={`View ${section.name} features`}
        >
          <button
            type="button"
            onClick={() => handleClick(section.id)}
            aria-label={`View ${section.name} features`}
          >
            {section.name}
            <RightOutlined className="ml-auto text-current" />
          </button>
        </Button>
      ))}
    </div>
  );
}
