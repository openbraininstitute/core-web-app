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
            'group text-primary-2 cursor-pointer border-none outline-0 outline-offset-0',
            cls?.trigger
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
          <MenubarItem asChild className="bg-primary-8 -m-[3.5px] h-14 text-white select-none">
            <div className="text-lg! font-bold">{userName}</div>
          </MenubarItem>

          <MenubarItem
            asChild
            className="hover:text-primary-8 h-[40.5px] cursor-pointer hover:bg-white"
          >
            <Link href="/app/virtual-lab/account/profile" className="text-lg!">
              Profile
            </Link>
          </MenubarItem>
          <MenubarItem
            asChild
            className="hover:text-primary-8 h-[40.5px] cursor-pointer hover:bg-white"
          >
            <Link href="/app/virtual-lab/account/subscription" className="text-lg!">
              Subscription
            </Link>
          </MenubarItem>
          <MenubarItem
            asChild
            className="hover:text-primary-8 h-[40.5px] cursor-pointer hover:bg-white"
          >
            <Link href="/app/virtual-lab/account/invoices" className="text-lg!">
              Invoices
            </Link>
          </MenubarItem>
          <MenubarItem
            asChild
            className="border-t-primary-7 hover:text-primary-8 h-[40.5px] cursor-pointer border-t hover:bg-white"
          >
            <Link href="/app/log-out" className="text-lg!">
              Logout
              <SignOutFill className="text-primary-2 ml-auto" />
            </Link>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
