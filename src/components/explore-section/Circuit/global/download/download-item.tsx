import Link from 'next/link';
import {
  DownloadItemProps,
  FileTypeHeaderProps,
  SingleSelectedDownloadableItemProps,
} from '../../type';

import { DownloadIcon } from '@/components/icons';
import { classNames } from '@/util/utils';

import styles from './download-item.module.css';

function DownloadChildrenItem({
  childrenItem,
}: {
  childrenItem: SingleSelectedDownloadableItemProps;
}) {
  const disabled = childrenItem.extension === 'directory';

  if (disabled) {
    return <div className={styles.comingSoon}>Coming soon...</div>;
  }

  return (
    <div className="flex w-full flex-row justify-between">
      <div className="w-3/4 hyphens-auto">
        <div className="text-lg font-bold text-white">{childrenItem.name}</div>
        <p className="text-primary-2 text-base leading-normal font-light hyphens-auto">
          {childrenItem.description}
        </p>
      </div>
      <div className="text-primary-2 flex flex-row gap-x-3 font-light">
        <div>{childrenItem.size}</div>
        <div>{childrenItem.extension}</div>
        <Link
          href={childrenItem.url}
          className="border-primary-6 flex h-7 w-7 items-center justify-center border border-solid"
          aria-label={`Add download ${childrenItem.name} to the cart`}
        >
          <DownloadIcon className="text-white" />
        </Link>
      </div>
    </div>
  );
}

export default function DownloadItem({
  item,
  header,
  className,
}: {
  item: DownloadItemProps;
  header: FileTypeHeaderProps;
  className?: string;
}) {
  const itemNumber = item.children ? item.children.length : 0;

  return (
    <div className={classNames('w-full', className)}>
      <header className="mb-6 flex flex-row justify-between">
        <div className="flex flex-col">
          <div className="flex flex-row items-center text-xl font-bold tracking-wider text-white uppercase before:mr-2 before:block before:h-3 before:w-3 before:rounded-full before:bg-white before:content-['']">
            {header.name}
          </div>
          {header.description}
        </div>
        <div className="text-primary-1 flex flex-row flex-nowrap gap-x-3 text-base font-bold">
          <div className="whitespace-nowrap">
            {itemNumber} File{itemNumber > 1 ? 's' : ''}
          </div>
          <div>{header.extension}</div>
        </div>
      </header>
      <div className="border-primary-7 flex flex-col gap-y-6 border-l border-solid pl-8">
        {item.children?.length !== 0 ? (
          item.children?.map((childrenItem: SingleSelectedDownloadableItemProps) => (
            <DownloadChildrenItem
              childrenItem={childrenItem}
              key={`downloading_item-${childrenItem.name}_${childrenItem.description}`}
            />
          ))
        ) : (
          <div className="border-primary-7 text-primary-2 w-full border border-solid p-8 text-base font-light">
            No files available for this type.
          </div>
        )}
      </div>
    </div>
  );
}
