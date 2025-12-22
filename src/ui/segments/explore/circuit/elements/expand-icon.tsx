import { Button } from 'antd';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import ChevronRight from '@/components/icons/ChevronRight';

import type { ICircuitEnriched } from '@/ui/segments/explore/circuit/helpers';
import { classNames } from '@/util/utils';

export const expandIcon = ({
  expanded,
  onExpand,
  record,
}: {
  expanded: boolean;
  onExpand: (record: ICircuit, event: React.MouseEvent<HTMLElement>) => void;
  record: ICircuit;
}) => {
  const enrichedRecord = record as ICircuitEnriched;
  if (!enrichedRecord.sub_circuits || enrichedRecord.sub_circuits.length === 0) return null;
  return (
    <Button type="text" onClick={(e) => onExpand(record, e)}>
      <ChevronRight
        fill="#003a8c"
        className={classNames(
          'transform transition-transform duration-200 ease-in-out',
          expanded ? 'rotate-90' : 'rotate-0'
        )}
      />
    </Button>
  );
};
