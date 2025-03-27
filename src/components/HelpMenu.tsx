import { ReactNode } from 'react';
import Link from 'next/link';

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from '@/components/Menu';
import { classNames } from '@/util/utils';

type Props = {
  children: ReactNode;
  cls?: {
    trigger?: string;
  };
};
export default function HelpMenu({ children, cls }: Props) {
  return (
    <Menubar className="border-none !p-0">
      <MenubarMenu>
        <MenubarTrigger
          className={classNames(
            'group cursor-pointer border-none text-primary-2 outline-0 outline-offset-0',
            cls?.trigger
          )}
          style={{ outline: 'none' }}
        >
          {children}
        </MenubarTrigger>
        <MenubarContent
          align="end"
          side="right"
          className="rounded-none border border-primary-7 bg-primary-9 text-white"
        >
          <MenubarItem
            asChild
            className="h-[40.5px] cursor-pointer hover:bg-white hover:text-primary-8"
          >
            <Link href="/about" className="!text-lg">
              About OBI
            </Link>
          </MenubarItem>
          <MenubarItem
            asChild
            className="h-[40.5px] cursor-pointer hover:bg-white hover:text-primary-8"
          >
            <a href="mailto:support@openbraininstitute.org" className="!text-lg">
              Contact support
            </a>
          </MenubarItem>
          <MenubarItem
            asChild
            className="h-[40.5px] cursor-pointer hover:bg-white hover:text-primary-8"
          >
            <Link href="/terms" className="!text-lg">
              Terms and conditions
            </Link>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
