'use client';

import { Tooltip } from 'antd';

import Link from 'next/link';
import { useState } from 'react';
import { SingleSectionProps } from '../type';

import { ChevronRight } from '@/components/icons';
import { classNames } from '@/util/utils';

export function ItemDisabled({ name }: { name: string }) {
  return (
    <Tooltip title="Coming soon" placement="topLeft">
      <div className="font-sans text-base font-normal text-white opacity-40">{name}</div>
    </Tooltip>
  );
}

export function ItemEnabled({
  content,
  name,
  link,
  sectionOpen,
  setSectionOpen,
}: {
  content: SingleSectionProps;
  name: string;
  link?: string;
  sectionOpen: boolean;
  setSectionOpen: (open: boolean) => void;
}) {
  return !content.children ? (
    <Link href={link ?? '#'} className="font-sans text-base font-normal text-white">
      {name}
    </Link>
  ) : (
    <div>
      <div className="flex w-full flex-row items-center justify-between">
        <div className="font-sans text-base font-normal text-white">{name}</div>
        <button
          type="button"
          aria-label="Toggle section"
          onClick={() => setSectionOpen(!sectionOpen)}
        >
          <ChevronRight
            fill="#69c0ff"
            className={classNames(
              'h-3 w-auto text-primary-3 transition-transform duration-200 ',
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
        {content.children !== null && (
          <div className="my-3 flex w-full flex-col gap-y-3 border-l border-solid border-primary-6 pl-4">
            {content.children.map((child: SingleSectionProps) => (
              <NavItem content={child} key={child.slug} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NavItem({ content }: { content: SingleSectionProps }) {
  const [sectionOpen, setSectionOpen] = useState<boolean>(false);

  return content.disabled ? (
    <ItemDisabled name={content.name} />
  ) : (
    <ItemEnabled
      content={content}
      name={content.name}
      link={content.link}
      sectionOpen={sectionOpen}
      setSectionOpen={setSectionOpen}
    />
  );
}
