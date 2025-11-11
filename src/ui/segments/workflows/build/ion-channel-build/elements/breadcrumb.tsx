import Link from 'next/link';

import Breadcrumb from '@/ui/molecules/breadcrumb';
import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/ui/molecules/breadcrumb/index';

export function AutomatedFormBreadcrumb({
  category: { label: categoryLabel, link: categoryLink, isUrl: categoryIsUrl },
  type: { label: typeLabel, link: typeLink, isUrl: typeIsUrl },
}: {
  category: { label: string; link: string; isUrl: boolean };
  type: { label: string; link: string; isUrl: boolean };
}) {
  return (
    <Breadcrumb showChevron={false}>
      <BreadcrumbList className="select-none">
        <BreadcrumbItem className="[&_a]:hover:text-primary-8! cursor-pointer text-base hover:font-medium!">
          <BreadcrumbLink asChild className="transition-colors hover:text-gray-900">
            {categoryIsUrl ? <Link href={categoryLink}>{categoryLabel}</Link> : categoryLabel}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="[&_svg]:size-3!" />
        <BreadcrumbItem className="[&_span]:hover:text-primary-8! text-base hover:font-medium!">
          <BreadcrumbLink asChild className="transition-colors hover:text-gray-900">
            {typeIsUrl ? <Link href={typeLink}>{typeLabel}</Link> : <span>{typeLabel}</span>}
          </BreadcrumbLink>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
