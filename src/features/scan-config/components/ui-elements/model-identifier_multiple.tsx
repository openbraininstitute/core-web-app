import { LinkOutlined } from '@ant-design/icons';

import {
  ScanConfigUIElementDict,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import { Badge } from '@/ui/molecules/badge';
import { cn } from '@/utils/css-class';

interface Props {
  className?: string;
  entities: TSupportedEntitiesForScanConfiguration | Array<TSupportedEntitiesForScanConfiguration>;
}

export default function ModelIdentifierMultiple({ className, entities }: Props) {
  const data = Array.isArray(entities) ? entities : [entities];
  return (
    <div
      className={cn(
        'flex flex-col gap-1 p-2 bg-background w-full border-neutral-2 border rounded-md',
        className
      )}
      data-scan-config-block-element={ScanConfigUIElementDict.ModelIdentifierMultiple}
    >
      {data.map((entity) => (
        <Badge
          key={entity?.id}
          variant="outline"
          className={cn(
            'relative flex h-auto items-start justify-start gap-1 py-1! bg-white cursor-default',
            'hover:bg-gray-100 hover:text-primary-8 min-w-0 w-full max-w-max rounded-md'
          )}
        >
          <div className={cn('flex flex-col items-start min-w-0 w-full')}>
            <div
              className={cn(
                'flex items-center justify-between gap-1',
                'text-primary-9 min-w-0 max-w-full text-xs lg:text-sm'
              )}
              title={entity?.id}
            >
              <span className="truncate max-w-full">{entity?.id}</span>
              <a
                href={`/app/entity/${entity?.id}`}
                target="_blank"
                title={`View entity: ${entity?.name}`}
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className={cn(
                  'inline-flex items-center justify-center text-primary-9 min-w-6!',
                  'min-h-6! px-1 border-gray-200 bg-white',
                  'transition-colors hover:bg-gray-100 hover:border-gray-300 rounded-full',
                  'hover:text-primary-9 pointer-events-auto [&_svg]:pointer-events-auto'
                )}
                aria-label={`View entity ${entity?.name}`}
              >
                <LinkOutlined />
              </a>
            </div>
            <div className="text-sm lg:text-base font-semibold">{entity?.name}</div>
          </div>
        </Badge>
      ))}
    </div>
  );
}
