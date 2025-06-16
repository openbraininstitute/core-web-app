'use client';

import { Tooltip } from 'antd';
import { useAtom } from 'jotai';
import { usePathname } from 'next/navigation';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SingleSectionProps } from '../type';

import { ChevronRight } from '@/components/icons';
import { activeNavItemAtom } from '@/state/documentation/currentSection';
import { classNames } from '@/util/utils';

export function ItemDisabled({ name }: { name: string }) {
  return (
    <Tooltip title="Coming soon" placement="topLeft">
      <div className="font-sans text-lg font-normal text-white opacity-40">{name}</div>
    </Tooltip>
  );
}

export function ItemEnabled({
  content,
  allContent,
  name,
  link,
  sectionOpen,
  setSectionOpen,
}: {
  content: SingleSectionProps;
  allContent: SingleSectionProps[];
  name: string;
  link: string;
  sectionOpen: boolean;
  setSectionOpen: (open: boolean) => void;
}) {
  const [activeNavItem, setActiveNavItem] = useAtom(activeNavItemAtom);
  const pathname = usePathname();

  useEffect(() => {
    const flattenItems = (items: SingleSectionProps[]): SingleSectionProps[] => {
      return items.reduce((acc, item) => {
        return [...acc, item, ...(item.children ? flattenItems(item.children) : [])];
      }, [] as SingleSectionProps[]);
    };

    const flatContent = flattenItems(allContent);
    const matchingItem = flatContent.find((item) => item.link === pathname);
    if (matchingItem) {
      setActiveNavItem(matchingItem);
      // If the matching item is a child of this content, open the section
      if (
        content.children?.some((child) => child.slug === matchingItem.slug) ||
        content.slug === matchingItem.slug
      ) {
        setSectionOpen(true);
      }
    } else {
      setActiveNavItem(null);
    }
  }, [pathname, setActiveNavItem, allContent, content, setSectionOpen]);

  return !content.children ? (
    <Link
      href={link}
      className={classNames(
        'font-sans text-lg',
        activeNavItem?.slug === content.slug
          ? 'flex flex-row items-center gap-x-6 font-bold after:relative after:top-0.5 after:block after:h-2 after:w-2 after:rounded-full after:bg-white after:content-[""]'
          : 'font-normal'
      )}
      aria-label={name}
    >
      {name}
    </Link>
  ) : (
    <div>
      <div className="flex w-full flex-row items-center justify-between">
        <div className="font-sans text-lg font-normal text-white">{name}</div>
        <button
          type="button"
          aria-label="Toggle section"
          onClick={() => setSectionOpen(!sectionOpen)}
        >
          <ChevronRight
            fill="#69c0ff"
            className={classNames(
              'h-3 w-auto text-primary-3 transition-transform duration-200',
              sectionOpen ? 'rotate-90' : 'rotate-0'
            )}
          />
        </button>
      </div>

      <div
        className={classNames(
          'overflow-hidden transition-height duration-500 ease-in-out',
          sectionOpen ? 'block' : 'hidden'
        )}
      >
        {content.children && (
          <div className="my-3 flex w-full flex-col gap-y-3 border-l border-solid border-primary-6 pl-4">
            {content.children.map((child: SingleSectionProps) => (
              <NavItem content={child} allContent={allContent} key={child.slug} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NavItem({
  content,
  allContent,
}: {
  content: SingleSectionProps;
  allContent: SingleSectionProps[];
}) {
  const [sectionOpen, setSectionOpen] = useState<boolean>(false);

  return content.disabled ? (
    <ItemDisabled name={content.name} />
  ) : (
    <ItemEnabled
      content={content}
      allContent={allContent}
      name={content.name}
      link={content.link}
      sectionOpen={sectionOpen}
      setSectionOpen={setSectionOpen}
    />
  );
}
