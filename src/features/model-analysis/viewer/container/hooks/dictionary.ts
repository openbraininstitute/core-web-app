import { get } from 'es-toolkit/compat';

import { EntityTypeDict, type TEntityTypeDict } from '@/api/entitycore/types';

export interface IValidationDocumentation {
  description: string;
  protocol?: {
    type: string;
    delay: string;
    duration: string;
    amplitude: string;
    totalDuration: string;
  };
  validation_condition?: string;
}

export function getDocumentation(
  assetPath: string,
  entityType: TEntityTypeDict
): IValidationDocumentation | undefined {
  const prefix = assetPath.split('.')[0].toLowerCase();
  const parts = prefix.split('_');
  let selection: IValidationDocumentation | undefined;
  for (let { length } = parts; length > 0; length--) {
    const key = parts.slice(0, length).join('_');
    const documentation = get(validationDocumentation, `${entityType}.${key}`);
    if (documentation) selection = documentation;
  }
  return selection;
}

export function getDocumentationForInputResistance(entityType: TEntityTypeDict) {
  return get(validationDocumentation, entityType, null)?.rin;
}

/**
 * The source of this dictionary comes from here:
 * https://github.com/openbraininstitute/obi_scientific_texts/blob/main/Platform_frontend_and_backend_texts/MEModel_validation/validation_description.json
 */

const memodelDictionary: Readonly<Record<string, IValidationDocumentation>> = {
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

/**
 * The source of this dictionary comes from here:
 * https://github.com/openbraininstitute/obi_scientific_texts/blob/main/Platform_frontend_and_backend_texts/EModel_analysis_validation/emodel_analysis_validation_description.json
 */
const emodelDictionary: Readonly<Record<string, IValidationDocumentation>> = {
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
      'Runs the model with an injected current of 200% of the threshold current (rheobase) in the soma. Voltage is recorded at soma and axon[0](0.5) (Axon Initial Segment, AIS) of the E-model.',
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
  currentscape: {
    description:
      '[Currentscape](https://github.com/openbraininstitute/Currentscape) plots are use to study the contribution of ionic currents ',
  },
  evo_parameter_density: {
    description:
      'This plots displays the evolution of parameter values during multi-objective optimization.',
  },
  optimisation: {
    description:
      'Cumulative optimization score of all optimization features. Lower scores infers better fits of EModel features with the experimental feature values',
  },
  parameter_distribution: {
    description:
      'The distrubtion of 10 best hall of Fame (HOF) optimization E-Model parameter values.',
  },
  scores: {
    description:
      'Z-scores of individual optimization model features. See https://doi.org/10.1016/j.patter.2023.100855 for more details.',
  },
  traces: {
    description:
      'The voltage responses of protocols used for optimization and validation during E-Model optimization.',
  },
};

export const validationDocumentation = {
  [EntityTypeDict.Emodel]: emodelDictionary,
  [EntityTypeDict.Memodel]: memodelDictionary,
};

const memodelMarkdown = `
ME-Model validation runs a series of validations to test the model quality. We calculate the threshold current (rheobase, if not present) and the input resistance of the model (Rin). The validations include:

1. Hyperpolization Validation
2. Input Resistance (Rin) Validation
3. Spiking Validation
4. AIS (Axon Initial Segment) Spiking Validation
5. Depolarization Block Validation
6. IV (Current-Voltage) Curve Validation
7. FI (Frequency-Current) Curve Validation
8. Back-propagating Action Potential (BPAP) Validation

The output figures for each validation, along with the validation protocol descriptions and validation conditions, are provided below. An ME-model PASSES validation if all individual validations pass. The ME-model validation status only represents a qualitative assessment of the model. Even if the ME-model FAILS validation, you can still run simulations with the model.

### Notes

- The platform skips certain validations when a model lacks specific sections, such as AIS Validation when AIS is absent, and BPAP Validation when dendrites are missing in the model, and their figures do not appear in the list below.
`;

const emodelMarkdown = `
E-model validation and analysis results include a series of tests/analyses to assess the model quality.

## E-model Validation

A series of 8 validations are performed on an E-model. We first also calculate the threshold current (rheobase, if not present) and the input resistance of the model (Rin). The validations include:

1. Hyperpolization Validation
2. Input Resistance (Rin) Validation
3. Spiking Validation
4. AIS (Axon Initial Segment) Spiking Validation
5. Depolarization Block Validation
6. IV (Current-Voltage) Curve Validation
7. FI (Frequency-Current) Curve Validation
8. Back-propagating Action Potential (BPAP) Validation

The output figures for each validation, along with the validation protocol descriptions and validation conditions, are provided below besides each figure.

## E-model Analysis

These are the analyses generated after the multi-objective optimization (using [BluePyEModel](https://github.com/openbraininstitute/BluePyEModel)/[BluePyOpt](https://github.com/openbraininstitute/BluePyOpt)) to build an E-model from experimental data: 3D morphology, intracellular electrophysiology data and ion channel models. See the paper [A universal workflow for creation, validation, and generalization of detailed neuronal models](https://doi.org/10.1016/j.patter.2023.100855) for more details.

E-model analyses has the following figures:

1. [Currentscape](https://github.com/openbraininstitute/Currentscape)
2. Parameter Evolution Density
3. Optimization
4. Parameter Distribution
5. Scores
6. Traces

### Notes

- An E-model PASSES validation if all individual validations pass. E-model validation status only represents a qualitative assessment of the model.
- The platform skips certain validations when a model lacks specific sections, such as AIS Validation when AIS is absent, and BPAP Validation when dendrites are missing in the model, and their figures do not appear in the list below.
- Some E-models may lack analysis figures as the optimization and experimental data for those that were not available on the platform.
- E-models are NOT simulatable on the platform. To simulate an E-model configuration, you need to create an ME-model. To learn more about the public E-models currently present on the platform, select the "Reports" tab on top right of the screen and navigate to "Single Cell" for more details.

`;

export const validationDescription = {
  [EntityTypeDict.Emodel]: emodelMarkdown,
  [EntityTypeDict.Memodel]: memodelMarkdown,
};
