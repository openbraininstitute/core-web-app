'use client';

import { Tooltip } from 'antd';
import { useAtom } from 'jotai';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ChevronRight } from '@/components/icons';
import { activeNavItemAtom } from '@/state/documentation/currentSection';
import { classNames } from '@/util/utils';

import type { SingleSectionProps } from '../type';

function ItemDisabled({ name }: { name: string }) {
  return (
    <Tooltip title="Coming soon" placement="topLeft">
      <div className="font-sans text-lg font-normal text-white opacity-40">{name}</div>
    </Tooltip>
  );
}

function ItemEnabled({
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

  const isActive =
    activeNavItem?.slug === content.slug ||
    (name === 'Glossary' && pathname.startsWith('/app/documentation/glossary'));

  return !content.children ? (
    <Link
      href={link}
      className={classNames(
        'flex flex-row font-sans text-lg',
        isActive
          ? 'items-center justify-between gap-x-6 font-bold text-white'
          : 'text-primary-3 justify-start font-normal'
      )}
      aria-label={name}
    >
      <span>{name}</span>
      {isActive && <div className="relative top-px block h-3 w-3 rounded-full bg-white" />}
    </Link>
  ) : (
    <div>
      <div className="flex w-full flex-row items-center justify-between">
        <Link
          href={link}
          className={classNames(
            'font-sans text-lg',
            isActive ? 'font-bold' : 'font-normal text-white'
          )}
        >
          {name}
        </Link>
        <button
          type="button"
          aria-label="Toggle section"
          onClick={() => setSectionOpen(!sectionOpen)}
        >
          <ChevronRight
            fill="#69c0ff"
            className={classNames(
              'text-primary-3 h-3 w-auto transition-transform duration-200',
              sectionOpen ? 'rotate-90' : 'rotate-0'
            )}
          />
        </button>
      </div>

      <div
        className={classNames(
          'transition-height overflow-hidden duration-500 ease-in-out',
          sectionOpen ? 'block' : 'hidden'
        )}
      >
        {content.children && (
          <div className="border-primary-6 my-3 flex w-full flex-col gap-y-3 border-l border-solid pl-4">
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
