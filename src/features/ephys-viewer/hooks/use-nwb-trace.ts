import { useEffect, useRef, useState } from 'react';
import { Session } from 'next-auth';

import NWBTrace from '@/features/ephys-viewer/nwb-trace';
import { IElectricalCellRecording } from '@/api/entitycore/types/entities/electrical-cell-recording';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { downloadAsset } from '@/api/entitycore/queries/assets';

export default function useTrace(
  resource: IElectricalCellRecording,
  session: Session | null
): [NWBTrace | null, Error | null] {
  const [nwbArrayBuffer, setNwbArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [trace, setTrace] = useState<NWBTrace | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const initialized = useRef<boolean>(false);

  useEffect(() => {
    if (!session) {
      return;
    }

    const asset = resource.assets?.find((a) => a.content_type === 'application/nwb');

    if (!asset) {
      setError(new Error('No NWB file found'));
      return;
    }

    downloadAsset<ArrayBuffer | null>({
      entityType: EntityTypeEnum.ElectricalCellRecording,
      entityId: resource.id,
      id: asset.id,
    })
      .then(setNwbArrayBuffer)
      .catch((e) => setError(e));
  }, [resource.assets, resource.id, session]);

  useEffect(() => {
    if (initialized.current || !nwbArrayBuffer) {
      return;
    }

    initialized.current = true;

    NWBTrace.create(resource.id, nwbArrayBuffer)
      .then((t) => setTrace(t))
      .catch((e) => setError(e));

    return () => {
      trace?.destroy();
      initialized.current = false;
    };
  }, [nwbArrayBuffer, resource.id]);

  return [trace, error];
}
