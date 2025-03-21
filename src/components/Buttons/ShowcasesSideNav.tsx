'use client';

import { DocumentIcon, DocumentPileIcon, UserIcon } from '../icons';

type ButotnListProps = {
  name: string;
  href: string;
  icon: JSX.Element;
};

const ButtonsList = [
  {
    name: 'Documentation',
    href: '/app/documentation',
    icon: <DocumentIcon iconColor="white" className="h-4 w-auto" />,
  },
  {
    name: 'User Account',
    href: '/app/users',
    icon: <UserIcon iconColor="white" className="h-4 w-auto" />,
  },
];

export default function ShowcasesSideNav() {
  return (
    <div className="fixed left-0 top-0 z-10 flex h-screen flex-col justify-between p-6">
      <a
        href="/app/showcases"
        key="Showcases"
        className="flex h-12 w-12 items-center justify-center border border-solid border-primary-6"
        aria-label="Go to all showcases"
      >
        <DocumentPileIcon iconColor="white" className="h-4 w-auto" />
      </a>

      <div className="flex flex-col gap-4">
        {ButtonsList.map((button: ButotnListProps) => (
          <a
            href={button.href}
            key={button.name}
            className="flex h-12 w-12 items-center justify-center border border-solid border-primary-6"
            aria-label={`Go to ${button.name}`}
          >
            {button.icon}
          </a>
        ))}
      </div>
    </div>
  );
}
