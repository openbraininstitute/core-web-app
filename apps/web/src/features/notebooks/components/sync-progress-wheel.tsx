import { cn } from '@/utils/css-class';

export function SyncProgressWheel({
  completed,
  total,
  warning,
  label,
}: {
  completed: number;
  total: number;
  warning: boolean;
  label?: string;
}) {
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <>
      <div className="relative">
        <svg
          className="h-48 w-48 -rotate-90 transform"
          viewBox="0 0 128 128"
          role="img"
          aria-label="Sync progress"
        >
          <circle cx="64" cy="64" r={radius} stroke="#e5e7eb" strokeWidth="4" fill="none" />
          <circle
            cx="64"
            cy="64"
            r={radius}
            stroke={warning ? '#ea580c' : '#003a8c'}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn('text-2xl font-bold select-none', {
              'text-orange-600': warning,
              'text-primary-8': !warning,
            })}
          >
            {Math.round(progress)}%
          </span>
        </div>
      </div>
      <p
        className={cn('text-center text-sm select-none', {
          'text-orange-600': warning,
          'text-primary-6': !warning,
        })}
      >
        {label ?? `Syncing to student projects (${completed}/${total})`}
      </p>
    </>
  );
}
