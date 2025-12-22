import { Image } from 'antd';
import { hasAssets } from '@/api/entitycore/guards';
import type {
  ISingleNeuronSimulation,
  ISingleNeuronSynaptomeSimulation,
} from '@/api/entitycore/types';
import { EmptyPreview, renderPreview } from '@/entity-configuration/definitions/renderer';
import { cn } from '@/utils/css-class';

export function SingleNeuronSimulationPreview({
  record,
}: {
  record: ISingleNeuronSimulation | ISingleNeuronSynaptomeSimulation;
}) {
  if (
    !hasAssets(record) ||
    (record.type !== 'single_neuron_synaptome_simulation' &&
      record.type !== 'single_neuron_simulation')
  )
    return EmptyPreview;

  const stimulation = renderPreview(
    record,
    undefined,
    undefined,
    cn('rounded-md h-auto relative w-full! bg-white '),
    'w-full! h-[200px]! flex!',
    true,
    (src) => (
      <Image
        src={src}
        alt={`${record.name} stimulation`}
        rootClassName="w-full h-full"
        className="h-full! w-full! rounded-md object-contain"
      />
    ),
    'simulation'
  );
  const stimulus = renderPreview(
    record,
    undefined,
    undefined,
    cn('rounded-md h-auto relative w-full! bg-white '),
    'w-full! h-[200px]! flex!',
    true,
    (src) => (
      <Image
        src={src}
        alt={`${record.name} stimulation`}
        rootClassName="w-full h-full"
        className="h-full! w-full! rounded-md object-contain"
      />
    ),
    'stimulus'
  );

  return (
    <div className="flex items-center justify-between gap-2">
      {stimulation}
      {stimulus}
    </div>
  );
}
