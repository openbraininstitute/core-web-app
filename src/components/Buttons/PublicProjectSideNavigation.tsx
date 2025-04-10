'use client';
import { DocumentIcon, DocumentPileIcon, HomeFillIcon, UserIcon } from '../icons';

import type { JSX } from 'react';

type ButotnListProps = {
  name: string;
  href: string;
  icon: JSX.Element;
};

const ButtonsList = [
  {
    name: 'Home',
    href: '/app/virtual-lab',
    icon: <HomeFillIcon iconColor="white" className="h-4 w-auto" />,
  },
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

export default function PublicProjectSideNavigation() {
  return (
    <div className="fixed top-0 left-0 z-10 flex h-screen flex-col justify-between p-6">
      <a
        href="/app/public-projects"
        key="Public Projects"
        className="border-primary-6 flex h-12 w-12 items-center justify-center border border-solid"
        aria-label="Go to all public projects"
      >
        <DocumentPileIcon iconColor="white" className="h-4 w-auto" />
      </a>

      <div className="flex flex-col gap-4 text-white">
        {ButtonsList.map((button: ButotnListProps) => (
          <a
            href={button.href}
            key={button.name}
            className="border-primary-6 flex h-12 w-12 items-center justify-center border border-solid"
            aria-label={`Go to ${button.name}`}
          >
            {button.icon}
          </a>
        ))}
      </div>
    </div>
  );
}
