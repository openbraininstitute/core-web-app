import React from 'react';

import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { useAppNotification } from '@/components/notification';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';

const pendingQueries = new Map<string, Promise<ICircuit | undefined | null>>();

/**
 * Retrieve a circuit from EntityCore.
 * @param circuitId
 * @returns `undefined` if the query is pending, `null` if an error occured and the circuit in case of success.
 */
export function useCircuit(circuitId: string | undefined): ICircuit | undefined | null {
  const { error } = useAppNotification();
  const [circuit, setCircuit] = React.useState<ICircuit | undefined | null>(undefined);

  React.useEffect(() => {
    if (!circuitId) {
      setCircuit(undefined);
      return;
    }

    getQuery(circuitId)
      .then(setCircuit)
      .catch((ex) => {
        error({
          message: `Unable to retrieve circuit "${circuitId}"!\n${ex}`,
        });
        setCircuit(null);
      });
  }, [circuitId, error]);

  return circuit;
}

export function useCircuitImageURL(circuitId: string | undefined) {
  const { error } = useAppNotification();
  const [url, setUrl] = React.useState<string | undefined>(undefined);
  const circuit = useCircuit(circuitId);

  React.useEffect(() => {
    const action = async () => {
      if (!circuit) return;

      const asset = circuit.assets.find(
        (item) => item.label === AssetLabel.simulation_designer_image
      );
      if (!asset) {
        error({ message: `No image found for circuit "${circuit.name}" (${circuitId})!` });
        return;
      }
      try {
        const resp = await downloadAsset({
          entityType: EntityTypeDict.Circuit,
          entityId: circuit.id,
          id: asset.id,
          asRawResponse: false,
        });
        if (!(resp instanceof ArrayBuffer)) {
          throw new Error('Wrong image format: expected ArrayBuffer!');
        }
        const blob = new Blob([resp], { type: asset.content_type });
        const newUrl = URL.createObjectURL(blob);
        setUrl(newUrl);
      } catch (ex) {
        error({
          message: `Unable to download image for circuit "${circuit.name}"!\n${ex}`,
        });
      }
    };
    action();
  }, [circuit, circuitId, error]);

  return url;
}

function getQuery(circuitId: string): Promise<ICircuit | undefined | null> {
  const query = pendingQueries.get(circuitId);
  if (query) return query;

  const newQuery = getCircuit({ id: circuitId });
  pendingQueries.set(circuitId, newQuery);
  return newQuery;
}
