import React from 'react';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { getMEModel } from '@/api/entitycore/queries/model/me-model';
import { EntityTypeDict, IMEModel, TEntityTypeDict } from '@/api/entitycore/types';
import { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { useAppNotification } from '@/components/notification';
import { CircuitOrigin } from '@/services/small-scale-simulator/types';
import { WorkspaceContext } from '@/types/common';

const pendingQueries = new Map<string, Promise<ICircuit | IMEModel | undefined | null>>();

/**
 * Retrieve a circuit from EntityCore.
 * @param modelId
 * @returns `undefined` if the query is pending, `null` if an error occured and the circuit in case of success.
 */
export function useModel(
  modelId: string | undefined,
  circuitOrigin: CircuitOrigin,
  ctx: WorkspaceContext
): ICircuit | IMEModel | undefined | null {
  const { error } = useAppNotification();
  const [model, setModel] = React.useState<ICircuit | IMEModel | undefined | null>(undefined);

  React.useEffect(() => {
    if (!modelId) {
      setModel(undefined);
      return;
    }

    getModelQuery(modelId, circuitOrigin, ctx)
      .then(setModel)
      .catch((ex) => {
        error({
          message: `Unable to retrieve model "${modelId}"!\n${ex}`,
        });
        setModel(null);
      });
  }, [modelId, error, circuitOrigin, ctx]);

  return model;
}

export function useCircuitImageURL(circuitId: string | undefined) {
  const { error } = useAppNotification();
  const [url, setUrl] = React.useState<string | undefined>(undefined);
  const circuit = useModel(circuitId, CircuitOrigin.MEMODEL);

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

function getModelQuery(
  modelId: string,
  circuitOrigin: CircuitOrigin,
  context: WorkspaceContext
): Promise<ICircuit | IMEModel | undefined | null> {
  const query = pendingQueries.get(modelId);
  if (query) return query;

  if (![CircuitOrigin.CIRCUIT, CircuitOrigin.MEMODEL].includes(circuitOrigin)) {
    throw new Error('Unsupported model type: ' + circuitOrigin);
  }

  const newQuery =
    circuitOrigin === CircuitOrigin.CIRCUIT
      ? getCircuit({ id: modelId, context })
      : getMEModel({ id: modelId, context });
  pendingQueries.set(modelId, newQuery);
  return newQuery;
}
