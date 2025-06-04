'use client';

import { useState } from 'react';
import { SingleSectionProps } from '../type';
import ComingSoonPill from './coming-soon-pill';
import { classNames } from '@/util/utils';
import { ArrowRightIcon, ChevronRight } from '@/components/icons';

export default function NavItem({ content }: { content: SingleSectionProps }) {
  const [sectionOpen, setSectionOpen] = useState<boolean>(false);

  return (
    <div>
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-row items-center gap-x-2">
          <div className="font-sans text-base font-normal text-white">{content.name}</div>
          {content.disabled ? <ComingSoonPill /> : null}
        </div>
        {!content.children ? (
          <ArrowRightIcon className="h-3 w-auto text-primary-3" />
        ) : (
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
        )}
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
