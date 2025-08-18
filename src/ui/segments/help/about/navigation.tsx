import Link from 'next/link';

import { RightOutlined } from '@ant-design/icons';

import { Button } from '@/ui/molecules/button';
import { getSearchParam, PageProps } from '@/utils/getSearchParams';

export type AboutNavigationProps = {
  id: string;
  name: string;
};

export default function AboutNavigation({ searchParams }: PageProps) {
  const sectionParams = getSearchParam(searchParams ?? {}, 'section');

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
      {content?.map((section: AboutNavigationProps) => {
        const params = new URLSearchParams(sectionParams?.toString());
        params.set('section', 'about');
        params.set('subsection', section.id);
        const href = `?${params.toString()}`;

        return (
          <Button
            rounded
            borderless
            asChild
            key={`view-${section.id}-features`}
            variant="outline"
            className="h-auto w-full justify-start font-bold shadow-sm"
            aria-label={`View ${section.name} features`}
          >
            <Link href={href} scroll={false}>
              {section.name}
              <RightOutlined className="ml-auto text-current" />
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
