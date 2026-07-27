import { LoadingOutlined } from '@ant-design/icons';

import { cn } from '@/utils/css-class';

const LOADING_LABEL = 'Loading visualization…';

interface VisualizationLoadingIndicatorProps {
  progress?: number;
  className?: string;
}

export function VisualizationLoadingIndicator({
  progress,
  className,
}: VisualizationLoadingIndicatorProps) {
  const showProgress = progress !== undefined && progress > 0;

  return (
    <div
      className={cn(
        // Cover the canvas until neurites replace soma placeholders; chip stays top-center.
        'absolute inset-0 z-10 bg-white/90 backdrop-blur-[1px]',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={LOADING_LABEL}
    >
      <div className="absolute inset-x-0 top-3 flex justify-center">
        <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm text-primary-9 shadow-md ring-1 ring-black/5 backdrop-blur">
          <LoadingOutlined spin />
          <span>{LOADING_LABEL}</span>
          {showProgress && <strong>{(100 * progress).toFixed(0)}%</strong>}
        </div>
      </div>
    </div>
  );
}
