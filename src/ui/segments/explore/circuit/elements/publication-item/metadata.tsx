import { BuildingLibrary, Calendar } from '@/components/icons/EditorIcons';
import { renderDate } from '@/entity-configuration/definitions/renderer';
import { cn } from '@/utils/css-class';

interface Props {
  publisher: string | null;
  date?: Date | null;
  className?: string;
}

export function Metadata({ publisher, date, className }: Props) {
  return (
    <div className={cn('text-paper-meta flex items-center gap-4 text-sm', className)}>
      {publisher && (
        <div className="flex items-center gap-1">
          <div className="border-neutral-2 flex items-center justify-center rounded-full border p-1">
            <BuildingLibrary className="text-white" />
          </div>
          <span className="text-white">{publisher}</span>
        </div>
      )}
      {date && (
        <div className="flex items-center gap-1">
          <div className="border-neutral-2 flex items-center justify-center rounded-full border p-1">
            <Calendar className="text-white" />
          </div>
          <span className="text-white">{renderDate(new Date(date).toISOString())}</span>
        </div>
      )}
    </div>
  );
}
