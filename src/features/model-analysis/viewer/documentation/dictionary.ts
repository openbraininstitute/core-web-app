interface Documentation {
  description: string;
  protocol: {
    type: string;
    delay: string;
    duration: string;
    amplitude: string;
    totalDuration: string;
  };
  validation_condition: string;
}

export function getDocumentation(assetPath: string): Documentation | undefined {
  const prefix = assetPath.split('.')[0].toLowerCase();
  const parts = prefix.split('_');
  let selection: Documentation | undefined;
  for (let { length } = parts; length > 0; length--) {
    const key = parts.slice(0, length).join('_');
    const documentation = DICTIONARY[key];
    if (documentation) selection = documentation;
  }
  return selection;
}

const DICTIONARY: Readonly<Record<string, Documentation>> = {
  spiking_test: {
    description:
      'Runs the model with an injected current of 130% of the threshold current (rheobase) in the soma.',
    protocol: {
      type: 'depolarizing step',
      delay: '250 ms',
      duration: '1350 ms',
      amplitude: '130% of threshold current',
      totalDuration: '1750 ms',
    },
    validation_condition: 'Validates if at least one spike is detected in the response.',
  },
  depolarization_block_test: {
    description:
      'Runs the model with an injected current of 200% of the threshold current (rheobase) in the soma.',
    protocol: {
      type: 'depolarizing step',
      delay: '250 ms',
      duration: '1350 ms',
      amplitude: '200% of threshold current',
      totalDuration: '1750 ms',
    },
    validation_condition:
      'Validates if no depolarization block is detected in the response, i.e. the response does not stay above the spike onset voltage for more than 150 ms and if no hyperpolarization block is detected, i.e. the response does not stay below -75 mV for more than 150 ms.',
  },
  hyperpolarization_test: {
    description:
      'Runs the model with an injected current of -40% of the threshold current (rheobase) in the soma.',
    protocol: {
      type: 'hyperpolarizing step',
      delay: '250 ms',
      duration: '3000 ms',
      amplitude: '-40% of threshold current',
      totalDuration: '3500 ms',
    },
    validation_condition:
      'Validates if the response voltage during stimulus is lower than the resting membrane potential.',
  },
  rin_test: {
    description: 'Computes the input resistance (Rin) of the soma of the cell.',
    protocol: {
      type: 'hyperpolarizing step',
      delay: '100 ms',
      duration: '500 ms',
      amplitude: '-40% of threshold current',
      totalDuration: '600 ms',
    },
    validation_condition: 'Validates if the input resistance is below 1000 MOhm.',
  },
  ais_spiking_test: {
    description:
      'Runs the model with an injected current of 200% of the threshold current (rheobase) in the soma.',
    protocol: {
      type: 'depolarizing step',
      delay: '250 ms',
      duration: '1350 ms',
      amplitude: '200% of threshold current',
      totalDuration: '1750 ms',
    },
    validation_condition:
      'Validates if the first spike detected in the axon occurs before the first spike detected in the soma.',
  },
  iv_test: {
    description: 'Computes the Voltage-Current curve recorded at the soma.',
    protocol: {
      type: 'subthreshold steps',
      delay: '100 ms',
      duration: '500 ms',
      amplitude: 'varying from 2 nA below threshold current to 0.1 nA below threshold current',
      totalDuration: '600 ms',
    },
    validation_condition: 'Validates if the linear fit to the curve has a positive slope.',
  },
  fi_test: {
    description: 'Computes the Frequency-Current curve recorded at the soma.',
    protocol: {
      type: 'suprathreshold steps',
      delay: '100 ms',
      duration: '500 ms',
      amplitude:
        'varying from threshold current to 300% of threshold current in increments of 50% of threshold currents',
      totalDuration: '600 ms',
    },
    validation_condition: 'Validates if the linear fit to the curve has a positive slope.',
  },
  bpap_test: {
    description:
      'Runs the model with an injected current of 1000% of the threshold current in the soma, and records its voltage response in all the dendrites.',
    protocol: {
      type: 'depolarizing step',
      delay: '1000 ms',
      duration: '5 ms',
      amplitude: '1000% of threshold current',
      totalDuration: '1500 ms',
    },
    validation_condition:
      'Validates if the voltage at the dendrite the further away from the soma is below the voltage in the soma.',
  },
};
