import { ReactNode } from 'react';
import Link from 'next/link';

import { useSession } from 'next-auth/react';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from '@/components/Menu';
import { SignOutFill } from '@/components/icons/EditorIcons';
import { classNames } from '@/util/utils';

type Props = {
  children: ReactNode;
  cls?: {
    trigger?: string;
  };
};
export default function UserMenu({ children, cls }: Props) {
  const { data } = useSession();
  const userName = data?.user.name ?? data?.user.username;
  return (
    <Menubar className="border-none p-0!">
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
          <MenubarItem asChild className="-m-[3.5px] h-14 select-none bg-primary-8 text-white">
            <div className="text-lg! font-bold">{userName}</div>
          </MenubarItem>

          <MenubarItem
            asChild
            className="h-[40.5px] cursor-pointer hover:bg-white hover:text-primary-8"
          >
            <Link href="/app/virtual-lab/account/profile" className="text-lg!">
              Profile
            </Link>
          </MenubarItem>
          <MenubarItem
            asChild
            className="h-[40.5px] cursor-pointer hover:bg-white hover:text-primary-8"
          >
            <Link href="/app/virtual-lab/account/subscription" className="text-lg!">
              Subscription
            </Link>
          </MenubarItem>
          <MenubarItem
            asChild
            className="h-[40.5px] cursor-pointer hover:bg-white hover:text-primary-8"
          >
            <Link href="/app/virtual-lab/account/invoices" className="text-lg!">
              Invoices
            </Link>
          </MenubarItem>
          <MenubarItem
            asChild
            className="h-[40.5px] cursor-pointer border-t border-t-primary-7 hover:bg-white hover:text-primary-8"
          >
            <Link href="/app/log-out" className="text-lg!">
              Logout
              <SignOutFill className="ml-auto text-primary-2" />
            </Link>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
