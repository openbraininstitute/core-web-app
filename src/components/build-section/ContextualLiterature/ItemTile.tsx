import { LoadingOutlined, SendOutlined } from '@ant-design/icons';

import type { JSX } from 'react';
import { classNames } from '@/util/utils';

type Props = {
  index?: number;
  question?: JSX.Element;
  onSelect?(): void;
  isPending?: boolean;
  selectable?: boolean;
};

function ItemTile({ index, question, onSelect, isPending, selectable = true }: Props) {
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className={classNames(
        'inline-flex w-full items-center justify-between rounded-md border border-gray-200 py-4 pr-6 pl-3',
        isPending && 'bg-gray-50',
        selectable
          ? 'group cursor-pointer hover:bg-gray-50'
          : 'cursor-default shadow-md select-none'
      )}
      onClick={onSelect}
    >
      <div className="inline-flex w-[90%] flex-col items-start justify-start">
        <span>{index}.</span>
        <div className="text-primary-8 text-left text-base leading-9 font-normal group-hover:font-bold">
          {question}
        </div>
      </div>
      {isPending ? (
        <LoadingOutlined className="ease-out-expo transition-all duration-200" />
      ) : (
        selectable && (
          <SendOutlined className="text-primary-8 group-hover:ease-out-expo opacity-0 group-hover:opacity-100 group-hover:transition-all group-hover:duration-200" />
        )
      )}
    </div>
  );
}

export default ItemTile;
