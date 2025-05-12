import Link from 'next/link';
import {
  DownloadItemProps,
  FileTypeHeaderProps,
  SingleSelectedDownloadableItemProps,
} from '../../type';

import { DownloadIcon } from '@/components/icons';

export function DownloadChildrenItem({
  childrenItem,
}: {
  childrenItem: SingleSelectedDownloadableItemProps;
}) {
  return (
    <div className="flex w-full flex-row justify-between">
      <div className="w-3/4 hyphens-auto">
        <div className="text-base font-bold text-white">{childrenItem.name}</div>
        <p className="hyphens-auto text-sm font-light leading-normal text-primary-2">
          {childrenItem.description}
        </p>
      </div>
      <div className="flex flex-row gap-x-3 font-light text-primary-2">
        <div>{childrenItem.size}</div>
        <div>{childrenItem.extension}</div>
        <Link
          href={childrenItem.url}
          className="flex h-7 w-7 items-center justify-center border border-solid border-primary-6"
          aria-label={`Add download ${childrenItem.name} to the cart`}
        >
          <DownloadIcon iconColor="white" />
        </Link>
      </div>
    </div>
  );
}

export default function DownloadItem({
  item,
  header,
}: {
  item: DownloadItemProps;
  header: FileTypeHeaderProps;
}) {
  const itemNumber = item.children ? item.children.length : 0;

  return (
    <div className="w-full">
      <header className="mb-3 flex flex-row justify-between">
        <div className="flex flex-col">
          <div className="flex flex-row items-center text-xl font-bold uppercase tracking-wider text-white before:mr-2 before:block before:h-3 before:w-3 before:rounded-full before:bg-white before:content-['']">
            {header.name}
          </div>
          {header.description}
        </div>
        <div className="flex flex-row flex-nowrap gap-x-3 text-base font-bold text-primary-1">
          <div className="whitespace-nowrap">
            {itemNumber} File{itemNumber > 1 ? 's' : ''}
          </div>
          <div>{header.extension}</div>
        </div>
      </header>
      <div className="flex flex-col gap-y-4  border-l border-solid border-primary-7 pl-8">
        {item.children?.map((childrenItem: SingleSelectedDownloadableItemProps) => (
          <DownloadChildrenItem childrenItem={childrenItem} key={childrenItem.name} />
        ))}
      </div>
    </div>
  );
}
