import { WarningOutlined } from '@ant-design/icons';
import { classNames } from '@/util/utils';

export function StatError({ text }: { text: string }) {
  return (
    <div
      className={classNames(
        'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        'bg-neutral-7 flex h-[50px] items-center gap-3 rounded-sm p-4 text-white'
      )}
    >
      <WarningOutlined className="text-xl" />
      {text}
    </div>
  );
}
