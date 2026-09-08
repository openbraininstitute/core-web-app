import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { isDirectoryAsset } from '@/features/scan-config/components/file-viewer/directory-entries';
import { classNames } from '@/util/utils';

import type { ReactNode } from 'react';
import type { TActivityCustomFile } from '@/features/scan-config/types';

type Props = {
  id?: string;
  name?: string;
  file: TActivityCustomFile;
  selected?: boolean;
  label?: ReactNode;
  onSelect: (file: TActivityCustomFile) => void;
};

export function TaskIOFileItem({ id, name, file, selected, label, onSelect }: Props) {
  const fileName = file.assetPath?.split('/').at(-1) ?? file.asset.path.split('/').at(-1);
  const isDirectory = isDirectoryAsset(file.asset);
  const isCircuitDirectory = isDirectory && file.asset.label === AssetLabel.sonata_circuit;
  const displayName = name ?? (isCircuitDirectory ? 'Circuit directory' : fileName);
  // a directory asset has no extension to fall back on, and "figures" is not a format
  const badgeContent = label ?? (isDirectory ? 'folder' : fileName?.split('.').at(-1));

  return (
    <button
      id={id}
      data-testid={`task-io-file-item-${id}`}
      data-file-name={displayName}
      type="button"
      title={displayName}
      className={classNames(
        'group flex w-full cursor-pointer flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-4xl p-4',
        selected ? 'bg-[linear-gradient(95.07deg,#003A8C_42.23%,#001026_109.71%)]' : 'bg-white',
        'hover:bg-gray-100'
      )}
      onClick={() => onSelect(file)}
    >
      <div
        className={classNames(
          'truncate overflow-hidden font-semibold whitespace-nowrap text-left',
          selected ? 'text-white' : 'text-primary-9'
        )}
      >
        <div>{displayName}</div>
      </div>
      <span
        className={classNames(
          'group-hover:bg-gray-200 group-hover:border-gray-100',
          'shrink-0 rounded-full border px-4 uppercase text-xs py-1',
          selected ? 'border-white text-primary-9 bg-white' : 'text-neutral-5 border-neutral-5'
        )}
      >
        {badgeContent}
      </span>
    </button>
  );
}
