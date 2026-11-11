import { RiArrowLeftLongLine, RiArrowRightSLine } from '@remixicon/react';
import Link from 'next/link';
import { Fragment } from 'react/jsx-runtime';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/ui/molecules/breadcrumb/index';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import type { JSX } from 'react';

type Props = {
  toBack: string;
  list: Array<{ title: string; link: string | null; customRenderer?: JSX.Element }>;
  className?: string;
};

export function BackButton({ list, toBack, className }: Props) {
  return (
    <div
      className={cn(
        'flex mr-auto  items-center justify-start gap-0.5 mb-5 text-primary-8',
        className
      )}
    >
      <Button asChild rounded className="shadow-md size-10! border border-neutral-2" variant="icon">
        <Link prefetch href={toBack} className="text-primary-8">
          <RiArrowLeftLongLine className="text-primary-8 " />
        </Link>
      </Button>
      <Breadcrumb className="ml-3">
        <BreadcrumbList>
          {list.map(({ customRenderer, title, link }, indx) => (
            <Fragment key={title}>
              {customRenderer ? (
                customRenderer
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbLink asChild className="text-primary-8 text-lg font-bold select-none">
                    {link ? (
                      <Link href={link} className="text-primary-8 hover:text-primary-7 ">
                        {title}
                      </Link>
                    ) : (
                      <span>{title}</span>
                    )}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              )}
              {indx !== list.length - 1 && (
                <BreadcrumbSeparator className="text-primary-9 text-lg font-bold">
                  <RiArrowRightSLine className="text-primary-8 size-4.5!" />
                </BreadcrumbSeparator>
              )}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
