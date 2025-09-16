import { BuildingLibrary, Calendar } from '@/components/icons/EditorIcons';
import { renderDate } from '@/entity-configuration/definitions/renderer';

interface Props {
  publisher: string | null;
  date?: string | null;
  className?: string;
}

export function Metadata({ publisher, date, className }: Props) {
  return (
    <div className={`text-paper-meta flex items-center gap-4 text-sm ${className || ''}`}>
      {publisher && (
        <div className="flex items-center gap-1">
          <div className="border-neutral-2 flex items-center justify-center rounded-full border p-1">
            <BuildingLibrary className="text-primary-8" />
          </div>
          <span>{publisher}</span>
        </div>
      )}
      {date && (
        <div className="flex items-center gap-1">
          <div className="border-neutral-2 flex items-center justify-center rounded-full border p-1">
            <Calendar className="text-primary-8" />
          </div>
          <span>{renderDate(date)}</span>
        </div>
      )}
    </div>
  );
}
