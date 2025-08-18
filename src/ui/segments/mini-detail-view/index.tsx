import { CloseOutlined } from '@ant-design/icons';
import { useState } from 'react';

import { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import { Card, CardTitle } from '@/ui/molecules/card';
import {
  makeSelectEntityClickEvent,
  useSelectEntityClickEvent,
} from '@/ui/segments/mini-detail-view/event';

export function MiniDetailView<T extends EntityCoreIdentifiableNamed>() {
  const [record, setRecord] = useState<T | null>(null);

  useSelectEntityClickEvent<T>((event) => {
    setRecord(event.detail.data);
  });

  const onClose = () => {
    makeSelectEntityClickEvent({ data: null, display: false });
  };

  if (!record) return null;

  return (
    <Card
      id="mini-viewer"
      data-testid="mini-viewer"
      className="bg-primary-9 h-full overflow-auto rounded-2xl p-5 text-white"
    >
      <CardTitle className="flex items-center justify-between gap-4">
        {record.name}
        <CloseOutlined className="text-white" onClick={onClose} />
      </CardTitle>
      <pre>{JSON.stringify(record, null, 2)}</pre>
    </Card>
  );
}

export default MiniDetailView;
