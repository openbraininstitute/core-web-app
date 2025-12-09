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

export function getDocumentationForInputResistance() {
  return DICTIONARY.rin;
}

/**
 * The source of this dictionary comes from here:
 * https://github.com/openbraininstitute/obi_scientific_texts/blob/main/Platform_frontend_and_backend_texts/MEModel_validation/validation_description.json
 */
const DICTIONARY: Readonly<Record<string, Documentation>> = {
  hyperpolarization: {
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
      'Passes if the response voltage during stimulus is lower than the resting membrane potential.',
  },
  rin: {
    description: 'Computes the input resistance (Rin) of the soma of the cell.',
    protocol: {
      type: 'hyperpolarizing step',
      delay: '100 ms',
      duration: '500 ms',
      amplitude: '-40% of threshold current',
      totalDuration: '600 ms',
    },
    validation_condition: 'Passes if the input resistance is below 1000 MOhm.',
  },
  spiking: {
    description:
      'Runs the model with an injected current of 130% of the threshold current (rheobase) in the soma.',
    protocol: {
      type: 'depolarizing step',
      delay: '250 ms',
      duration: '1350 ms',
      amplitude: '130% of threshold current',
      totalDuration: '1750 ms',
    },
    validation_condition: 'Passes if at least one spike is detected in the response.',
  },
  ais_spiking: {
    description:
      'Runs the model with an injected current of 200% of the threshold current (rheobase) in the soma. Voltage is recorded at soma and axon[0](0.5) (Axon Initial Segment, AIS) of the ME-model.',
    protocol: {
      type: 'depolarizing step',
      delay: '250 ms',
      duration: '1350 ms',
      amplitude: '200% of threshold current',
      totalDuration: '1750 ms',
    },
    validation_condition:
      'Passes if the first spike detected in the AIS occurs before the first spike detected in the soma.',
  },
  depolarization_block: {
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
      'Passes if no depolarization block is detected in the response, i.e. the response does not stay above the spike onset voltage for more than 150 ms and if no hyperpolarization block is detected, i.e. the response does not stay below -75 mV for more than 150 ms.',
  },
  iv: {
    description:
      'Computes the Current-Voltage (IV) curve recorded at the soma. Subthreshold step current (I) clamp protocols are applied to the model and the steady state membrane potenial (V) at the end of the step is calculated and plotted.',
    protocol: {
      type: 'subthreshold steps',
      delay: '100 ms',
      duration: '500 ms',
      amplitude: 'varying from 2 nA below threshold current to 0.1 nA below threshold current',
      totalDuration: '600 ms',
    },
    validation_condition: 'Passes if the linear fit to the curve has a positive slope.',
  },
  fi: {
    description:
      'Computes the Frequency-Current (FI) curve recorded at the soma. Suprathreshold step current (I) clamp protocols are applied to the model and AP firing frequency (F) is calculated and plotted.',
    protocol: {
      type: 'suprathreshold steps',
      delay: '100 ms',
      duration: '500 ms',
      amplitude:
        'varying from threshold current to 300% of threshold current in increments of 50% of threshold current',
      totalDuration: '600 ms',
    },
    validation_condition: 'Passes if the linear fit to the curve has a positive slope.',
  },
  bpap: {
    description:
      'Runs the model with an injected current of 1000% of the threshold current in the soma, and records its voltage response in all the dendrites (apical and basal). Individual voltage recordings at different dendritic distance from the soma are plotted. The peak voltages at each distance are also calculated and plotted for different dendritic distances.',
    protocol: {
      type: 'depolarizing step',
      delay: '1000 ms',
      duration: '5 ms',
      amplitude: '1000% of threshold current',
      totalDuration: '1500 ms',
    },
    validation_condition:
      'Passes if the voltage at the dendrite the further away from the soma is below the voltage in the soma.',
  },
  thumbnail: {
    description:
      'Runs the model with an injected current of 130% of the threshold current (rheobase) in the soma.',
    protocol: {
      type: 'depolarizing step',
      delay: '250 ms',
      duration: '1350 ms',
      amplitude: '130% of threshold current',
      totalDuration: '1800 ms',
    },
    validation_condition: 'No Validation is performed. A thumbnail figure is generated.',
  },
};
