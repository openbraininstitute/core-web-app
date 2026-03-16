import { InputNumber } from 'antd';
import map from 'es-toolkit/compat/map';

import { getRandomIntInclusive } from '@/util/utils';

import { Label } from '../../label';

import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { SessionValue } from '../../types';

export interface InputSeedProps {
  color?: string;
  sessionValue: SessionValue;
  setSessionValue(sessionValue: SessionValue): void;
}

export function InputSeed({ sessionValue, setSessionValue }: InputSeedProps) {
  const seed = sessionValue?.seed ?? 100;
  const onChangeSeed = (value: number | null) => {
    setSessionValue({
      ...sessionValue,
      seed: value ?? 100,
      synapseSets: updateSeeds(
        sessionValue?.synapseSets ?? new Map(),
        () => Number(value) + getRandomIntInclusive(0, Number(value))
      ),
    });
  };

  return (
    <div className="mb-4 flex w-full items-center justify-between px-3">
      <div className="flex items-center gap-2">
        {/* This widget will be back later: when the stype has been decided. */}
        {/* {color && (
          <>
            <Label text="Color of the Synaptic Set:" />
            <div className={styles.colorInput} style={{ background: color }} />
          </>
        )} */}
      </div>
      <div className="flex items-center gap-2">
        {<Label text="seed" required />}
        <InputNumber
          placeholder="Set a seed"
          defaultValue={seed}
          size="large"
          min={0}
          precision={0}
          onChange={onChangeSeed}
          value={seed}
          className="border-neutral-3! [&_.ant-input-number-input]:text-primary-9! max-w-[100px] rounded-md border-[1px]! font-bold"
        />
      </div>
    </div>
  );
}

function updateSeeds(
  synaptomeMap: Map<string, TSingleNeuronSynaptomeConfiguration>,
  getNewSeed: (oldSeed: number, key: string) => number
): Map<string, TSingleNeuronSynaptomeConfiguration> {
  return new Map(
    map(Array.from(synaptomeMap.entries()), ([key, config]) => [
      key,
      {
        ...config,
        seed: getNewSeed(config.seed, key),
      },
    ])
  );
}
