/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import Link from 'next/link';

import { DEFAULT_SECTION } from '../../../constants';
import { IconClose } from '../../../icons/IconClose';

import { EnumSection } from '@/components/LandingPage/sections/sections';

import { classNames } from '@/util/utils';

interface MenuItem {
  caption: string;
  slug: string;
  index?: EnumSection;
  submenu?: Array<{ caption: string; slug: string; index?: EnumSection }>;
}

const MENU_ITEMS: MenuItem[] = [
  {
    caption: 'About',
    slug: '/about',
    index: EnumSection.About,
    submenu: [
      { caption: 'About OBI', slug: '/about', index: EnumSection.About },
      { caption: 'Our story', slug: '/the-real-digital-brain-story', index: EnumSection.Story },
      { caption: 'Mission', slug: '/mission', index: EnumSection.Mission },
      { caption: 'Team', slug: '/team', index: EnumSection.Team },
    ],
  },
  {
    caption: 'Resources',
    slug: '/resources',
    index: EnumSection.Resources,
    submenu: [
      { caption: 'Notebooks', slug: '/notebooks' },
      { caption: 'Gallery', slug: '/gallery', index: EnumSection.Gallery },
    ],
  },
  {
    caption: 'The Platform',
    slug: '/pricing',
    submenu: [{ caption: 'Pricing', slug: '/pricing', index: EnumSection.Pricing }],
  },
  {
    caption: 'News',
    slug: '/news',
    index: EnumSection.News,
  },
  {
    caption: 'Contact',
    slug: '/contact',
    index: EnumSection.Contact,
  },
];

interface PopupMenuProps {
  className?: string;
  visible: boolean;
  onChange(visible: boolean): void;
}

export default function PopupMenu({ className, visible, onChange }: PopupMenuProps) {
  return (
    <div
      className={classNames(
        className,
        'fixed top-0 left-0 z-[9999] h-full w-full cursor-pointer bg-white transition-all duration-200',
        visible
          ? 'pointer-events-auto translate-x-0 opacity-100'
          : 'pointer-events-none translate-x-full opacity-100 lg:pointer-events-none lg:opacity-0'
      )}
      onClick={() => onChange(false)}
      role="dialog"
      onKeyDown={(evt) => {
        if (evt.key === 'Escape') onChange(false);
      }}
    >

      <menu className="border-neutral-3 absolute top-4 right-4 bottom-4 left-4 grid h-[calc(100%-2rem)] max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] grid-rows-[auto_1fr] gap-4 border bg-white">

        <header className="absolute top-0 left-0 flex h-auto w-full justify-end">
          <button
            className="text-[1em]"
            type="button"
            aria-label="Close popup menu"
            onClick={() => onChange(false)}
          >
            <IconClose />
          </button>
        </header>

        <section className="absolute top-12 bottom-0 left-0 flex h-auto w-full flex-col gap-y-4 overflow-y-auto pl-8">
          {/* Home */}
          <Link
            className="font-title flex cursor-pointer items-center justify-between gap-4 border-none text-3xl! font-semibold"

            key={DEFAULT_SECTION.caption}
            onClick={() => {
              onChange(false);
            }}
            href={DEFAULT_SECTION.slug}
          >
            <div>{DEFAULT_SECTION.caption}</div>
          </Link>

          {/* Menu items with submenus as titles */}
          {MENU_ITEMS.map((item) => {
            if (item.submenu) {
              return (
                <div key={item.caption}>
                  <div className="mb-4 block h-px w-full bg-gray-200" />
                  <div className="flex flex-col gap-y-4 text-3xl" key={item.caption}>
                    {item.submenu.map((subItem) => (
                      <Link
                        className="font-title mt-[-1px] flex cursor-pointer items-center justify-between border-none text-3xl! font-semibold"
                        key={subItem.slug}
                        onClick={() => {
                          onChange(false);
                        }}
                        href={subItem.slug}
                      >
                        <div>{subItem.caption}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }
            // Regular links (News, Contact)
            return (
              <Link
                className="font-title flex cursor-pointer items-center justify-between border-none text-3xl! font-semibold"

                key={item.slug}
                onClick={() => {
                  onChange(false);
                }}
                href={item.slug}
              >
                <div>{item.caption}</div>
              </Link>
            );
          })}

          {/* Login */}
          <Link
            className="font-title mt-[-1px] flex cursor-pointer items-center justify-between border-none text-3xl! font-semibold"

            onClick={() => {
              onChange(false);
            }}
            href="/app/virtual-lab"
          >
            Login
          </Link>
        </section>
        {/* <LoginButton /> */}
      </menu>
    </div>
  );
}
