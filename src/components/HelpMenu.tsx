import Link from 'next/link';
import type { ReactNode } from 'react';

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
    <Menubar className="border-none p-0!">
      <MenubarMenu>
        <MenubarTrigger
          className={classNames(
            'group text-primary-2 cursor-pointer border-none outline-0 outline-offset-0',
            cls?.trigger,
          )}
          style={{ outline: 'none' }}
        >
          {children}
        </MenubarTrigger>
        <MenubarContent
          align="end"
          side="right"
          className="border-primary-7 bg-primary-9 rounded-none border text-white"
        >
          <MenubarItem
            asChild
            className="hover:text-primary-8 h-[40.5px] cursor-pointer hover:bg-white"
          >
            <Link href="/about" className="text-lg!">
              About OBI
            </Link>
          </MenubarItem>
          <MenubarItem
            asChild
            className="hover:text-primary-8 h-[40.5px] cursor-pointer hover:bg-white"
          >
            <Link href="/contact" className="!text-lg">
              Contact support
            </Link>
          </MenubarItem>
          <MenubarItem
            asChild
            className="hover:text-primary-8 h-[40.5px] cursor-pointer hover:bg-white"
          >
            <Link href="/terms" className="text-lg!">
              Terms and conditions
            </Link>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
