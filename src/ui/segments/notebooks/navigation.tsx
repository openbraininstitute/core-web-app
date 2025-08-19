import { Button } from '@/ui/molecules/button';
import { RightOutlined } from '@ant-design/icons';
import Link from 'next/link';

export type NotebookNavigationProps = {
  id: string;
  name: string;
  href: string;
};

export default function NotebookNavigation() {
  const sections: NotebookNavigationProps[] = [
    { id: 'example', name: 'Example', href: '/notebooks/example' },
    { id: 'applied', name: 'Applied', href: '/notebooks/applied' },
  ];

  return (
    <div className="col-span-1 flex flex-col gap-y-3">
      {sections.map((section: NotebookNavigationProps) => (
        <Button
          rounded
          borderless
          asChild
          key={`view-${section.id}-features`}
          variant="outline"
          className="shadow-base h-15 w-full justify-start px-6 text-lg font-semibold"
          aria-label={`View ${section.name} features`}
        >
          <Link href={section.href} scroll={false}>
            {section.name}
            <RightOutlined className="ml-auto text-current" />
          </Link>
        </Button>
      ))}
    </div>
  );
}
