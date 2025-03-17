'use client';

import { usePathname } from 'next/navigation';

import Item, { Props } from '@/components/VirtualLab/side-bar/item';
import Base from '@/components/VirtualLab/side-bar/base';

const menuItems: Array<Props> = [
  {
    url: '/app/virtual-lab/account/profile',
    title: 'Profile',
  },
  {
    url: '/app/virtual-lab/account/subscription',
    title: 'Subscription',
  },
  {
    url: '/app/virtual-lab/account/invoices',
    title: 'Invoices',
  },
];

export default function SideBar() {
  const path = usePathname();
  return (
    <Base>
      <nav className="flex max-h-full flex-1 flex-col py-4">
        <div className="mt-20 border border-primary-5">
          {menuItems.map(({ url, title, disabled }) => (
            <Item
              key={url}
              url={url}
              title={title}
              active={path.startsWith(url)}
              disabled={disabled}
            />
          ))}
        </div>
      </nav>
    </Base>
  );
}
