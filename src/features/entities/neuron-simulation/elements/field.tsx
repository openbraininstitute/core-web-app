import { classNames } from '@/util/utils';

export function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="text-primary-7 mr-10 mb-4 text-sm">
      <div className="text-neutral-4 uppercase">{label}</div>
      <div className={classNames('break-words', className)}>{value}</div>
    </div>
  );
}
