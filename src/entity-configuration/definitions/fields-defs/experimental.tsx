import find from 'lodash/find';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';

import getMeasurements, {
  EmptyValue,
  renderArray,
  renderEmptyOrValue,
  renderFloatNumber,
  renderLicense,
  renderMeanStd,
  renderMorphologyMeasurement,
} from '@/entity-configuration/definitions/renderer';
import {
  CoreFieldFilterTypeEnum,
  EntityCoreFields,
} from '@/entity-configuration/definitions/fields-defs/enums';
import { StructuralDomain } from '@/api/entitycore/types/entities/measurement-annotation';
import { CoreFieldType } from '@/entity-configuration/definitions/types';
import { isMemodel, isSingleNeuronSynaptome } from '@/api/entitycore/guards';
import { DataType } from '@/constants/explore-section/list-views';
import { ensureArray } from '@/utils/array';

import type { IExperimentalSynapsesPerConnection } from '@/api/entitycore/types/entities/synapses-per-connection';
import type {
  EntityCoreDensityObjectTypes,
  EntityCoreObjectTypes,
  IEModel,
  IReconstructionMorphology,
} from '@/api/entitycore/types';
import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';
import type { IEType, IMType } from '@/api/entitycore/types/shared/global';

export const FieldsDefinition: Partial<FieldsDefinitionRegistry<EntityCoreObjectTypes>> = {
  [EntityCoreFields.License]: {
    title: 'License',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => {
      if ('license' in r) return renderEmptyOrValue(renderLicense({ license: r.license }));
      return EmptyValue;
    },
    vocabulary: {
      plural: 'Licenses',
      singular: 'License',
    },
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.Species]: {
    title: 'Species',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => {
      if ('species' in r)
        return renderEmptyOrValue(
          renderArray(ensureArray({ input: r.species }).map((s) => s.name))
        );
      if ('subject' in r && 'species' in r.subject)
        return renderEmptyOrValue(r.subject.species.name);
      return EmptyValue;
    },
    vocabulary: {
      plural: 'Species',
      singular: 'Species',
    },
    defaultConstraint: 'species__name__in',
    perTypeConstraint: {
      [DataType.ExperimentalNeuronMorphology]: 'subject__species__name__in',
      [DataType.ExperimentalElectroPhysiology]: 'subject__species__name__in',
      [DataType.ExperimentalBoutonDensity]: 'subject__species__name__in',
      [DataType.ExperimentalNeuronDensity]: 'subject__species__name__in',
      [DataType.ExperimentalSynapsePerConnection]: 'subject__species__name__in',
    },
    order: [
      {
        types: [
          DataType.ExperimentalElectroPhysiology,
          DataType.ExperimentalBoutonDensity,
          DataType.ExperimentalNeuronDensity,
          DataType.ExperimentalSynapsePerConnection,
        ],
        property: 'order_by',
        value: 'subject__species__name',
      },
    ],
    isSortable: true,
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.MType]: {
    fieldType: CoreFieldType.CellType,
    title: 'M-Type',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => {
      if (isSingleNeuronSynaptome(r)) {
        return renderEmptyOrValue(renderArray(r.me_model.mtypes?.map((m) => m.pref_label) || []));
      }
      if (isMemodel(r) && isEmpty(r.etypes)) {
        return renderEmptyOrValue(
          renderArray(
            (
              r.morphology as IReconstructionMorphology & { etypes: Array<IMType> | null }
            ).mtypes?.map((m) => m.pref_label) || []
          )
        );
      }
      return renderEmptyOrValue(
        renderArray(
          (r as EntityCoreObjectTypes & { mtypes: Array<IMType> | null }).mtypes?.map(
            (m: IMType) => m.pref_label
          ) || []
        )
      );
    },
    vocabulary: {
      plural: 'M-Types',
      singular: 'M-Type',
    },
    defaultConstraint: 'mtype__pref_label__in',
    order: [
      {
        types: [
          DataType.ExperimentalBoutonDensity,
          DataType.ExperimentalNeuronDensity,
          DataType.ExperimentalNeuronMorphology,
          DataType.CircuitEModel,
        ],
        property: 'order_by',
        value: 'mtype__pref_label',
      },
    ],
    isSortable: true,
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.EType]: {
    fieldType: CoreFieldType.CellType,
    title: 'E-Type',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => {
      if (isSingleNeuronSynaptome(r)) {
        return renderEmptyOrValue(renderArray(r.me_model.etypes?.map((m) => m.pref_label) || []));
      }
      if (isMemodel(r) && isEmpty(r.etypes)) {
        return renderEmptyOrValue(
          renderArray(
            (r.emodel as IEModel & { etypes: Array<IEType> | null }).etypes?.map(
              (e) => e.pref_label
            ) || []
          )
        );
      }
      return renderEmptyOrValue(
        renderArray(
          (r as EntityCoreObjectTypes & { etypes: Array<IEType> | null }).etypes?.map(
            (e: IEType) => e.pref_label
          ) || []
        )
      );
    },
    vocabulary: {
      plural: 'E-Types',
      singular: 'E-Type',
    },
    defaultConstraint: 'etype__pref_label__in',
    order: [
      {
        types: [DataType.ExperimentalElectroPhysiology, DataType.CircuitEModel],
        property: 'order_by',
        value: 'etype__pref_label',
      },
    ],
    isSortable: true,
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.NumberOfMeasurements]: {
    title: 'N° of Measurements',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    render: (r) => {
      return renderEmptyOrValue(
        find(ensureArray({ input: (r as EntityCoreDensityObjectTypes).measurements }), {
          unit: 'dimensionless',
        })?.value
      );
    },
    vocabulary: {
      plural: 'Values',
      singular: 'Value',
    },
    isSortable: false,
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.SubjectAge]: {
    title: 'Age',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    render: (r) => renderEmptyOrValue((r as EntityCoreDensityObjectTypes).subject.age_value),
    vocabulary: {
      plural: 'Ages',
      singular: 'Age',
    },
    isFilterable: false,
    isDisplayable: true,
    isSortable: true,
    order: [
      {
        types: [DataType.ExperimentalBoutonDensity, DataType.ExperimentalNeuronDensity],
        property: 'order_by',
        value: 'subject__age_value',
      },
    ],
  },
  [EntityCoreFields.MeanSTD]: {
    title: 'Mean ± STD',
    unit: (
      <>
        µm<sup>-1</sup>
      </>
    ),
    filter: CoreFieldFilterTypeEnum.ValueRange,
    render: (r) => {
      const { mean, std } = getMeasurements(r as EntityCoreDensityObjectTypes);
      return renderMeanStd({ mean, std });
    },
    vocabulary: {
      plural: 'Values',
      singular: 'Value',
    },
    isFilterable: false,
    isSortable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.Sem]: {
    title: 'SEM',
    description: 'Standard error of the mean',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    render: (r) => {
      const { se } = getMeasurements(r as EntityCoreDensityObjectTypes);
      return renderEmptyOrValue(Number(se?.value));
    },
    vocabulary: {
      plural: 'Values',
      singular: 'Value',
    },
    isSortable: false,
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.PreSynapticBrainRegion]: {
    title: 'Brain Region [From]',
    render: (r) => {
      return renderEmptyOrValue((r as IExperimentalSynapsesPerConnection).pre_region.name);
    },
    vocabulary: {
      plural: 'Brain Region [From]',
      singular: 'Brain Region [From]',
    },
    filter: CoreFieldFilterTypeEnum.CheckList,
    defaultConstraint: 'pre_region__name__in',
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.PostSynapticBrainRegion]: {
    title: 'Brain Region [To]',
    render: (r) => {
      return renderEmptyOrValue((r as IExperimentalSynapsesPerConnection).post_region.name);
    },
    vocabulary: {
      plural: 'Brain Region [To]',
      singular: 'Brain Region [To]',
    },
    filter: CoreFieldFilterTypeEnum.CheckList,
    defaultConstraint: 'post_region__name_in',
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.PreSynapticCellType]: {
    title: 'Cell Type [From]',
    render: (r) => {
      return renderEmptyOrValue((r as IExperimentalSynapsesPerConnection).pre_mtype.pref_label);
    },
    filter: CoreFieldFilterTypeEnum.CheckList,
    vocabulary: {
      plural: 'Cell Type [From]',
      singular: 'Cell Type [From]',
    },
    defaultConstraint: 'pre_mtype__pref_label__in',
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.PostSynapticCellType]: {
    title: 'Cell Type [To]',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => {
      return renderEmptyOrValue((r as IExperimentalSynapsesPerConnection).post_mtype.pref_label);
    },
    vocabulary: {
      plural: 'Cell Type [To]',
      singular: 'Cell Type [To]',
    },
    defaultConstraint: 'post_mtype__pref_label__in',
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.Weight]: {
    title: 'Weight',
    filter: CoreFieldFilterTypeEnum.CheckList,
    unit: 'gramms',
    render: (r) => {
      return renderEmptyOrValue(get(r, 'subject.weight', null));
    },
    vocabulary: {
      plural: 'Values',
      singular: 'Value',
    },
    isSortable: false,
    isFilterable: false,
    isDisplayable: false,
  },
  [EntityCoreFields.NeuronDensity]: {
    title: 'Density',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    unit: '1/mm³',
    render: (r) => {
      const { mean } = getMeasurements(r as EntityCoreDensityObjectTypes);
      return renderEmptyOrValue(`${renderFloatNumber(mean?.value)}`);
    },
    vocabulary: {
      plural: 'Densities',
      singular: 'Density',
    },
    isSortable: false,
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.AxonTotalLength]: {
    group: StructuralDomain.Axon,
    title: 'Total Length',
    description: 'Total length of the axon',
    filter: null,
    vocabulary: {
      plural: 'Total Length',
      singular: 'Total Length',
    },
    render: (r) =>
      renderMorphologyMeasurement(
        r as IReconstructionMorphology,
        StructuralDomain.Axon,
        'total_length',
        'raw',
        true
      ),
  },
  [EntityCoreFields.AxonStrahlerNumber]: {
    group: StructuralDomain.Axon,
    title: 'Strahler number',
    description: 'Strahler number',
    filter: null,
    vocabulary: {
      plural: 'Strahler number',
      singular: 'Strahler number',
    },
    render: (r) =>
      renderMorphologyMeasurement(
        r as IReconstructionMorphology,
        StructuralDomain.Axon,
        'section_strahler_orders',
        'maximum'
      ),
  },
  [EntityCoreFields.AxonArborAsymmetryIndex]: {
    group: StructuralDomain.Axon,
    title: 'Arbor Asymmetry Index',
    description: 'Arbor asymmetry index (if calculated)',
    filter: null,
    vocabulary: {
      plural: 'Arbor Asymmetry Index',
      singular: 'Arbor Asymmetry Index',
    },
    render: (r) =>
      renderMorphologyMeasurement(
        r as IReconstructionMorphology,
        StructuralDomain.Axon,
        'partition_asymmetry',
        'mean'
      ),
  },
  [EntityCoreFields.BasalDendriticTotalLength]: {
    group: StructuralDomain.BasalDendrite,
    title: 'Total Length',
    description: 'Total length of the basal dendrites',
    filter: null,
    vocabulary: {
      plural: 'Total Length',
      singular: 'Total Length',
    },
    render: (r) =>
      renderMorphologyMeasurement(
        r as IReconstructionMorphology,
        StructuralDomain.BasalDendrite,
        'total_length',
        'raw',
        true
      ),
  },
  [EntityCoreFields.BasalDendriteStrahlerNumber]: {
    group: StructuralDomain.BasalDendrite,
    title: 'Strahler number',
    description: 'Strahler number',
    filter: null,
    vocabulary: {
      plural: 'Strahler number',
      singular: 'Strahler number',
    },
    render: (r) =>
      renderMorphologyMeasurement(
        r as IReconstructionMorphology,
        StructuralDomain.BasalDendrite,
        'section_strahler_orders',
        'maximum'
      ),
  },
  [EntityCoreFields.BasalArborAsymmetryIndex]: {
    group: StructuralDomain.BasalDendrite,
    title: 'Arbor Asymmetry Index',
    description: 'Basal Arbor asymmetry index (if calculated)',
    filter: null,
    vocabulary: {
      plural: 'Arbor Asymmetry Index',
      singular: 'Arbor Asymmetry Index',
    },
    render: (r) =>
      renderMorphologyMeasurement(
        r as IReconstructionMorphology,
        StructuralDomain.BasalDendrite,
        'partition_asymmetry',
        'mean'
      ),
  },
  [EntityCoreFields.ApicalDendriticTotalLength]: {
    group: StructuralDomain.ApicalDendrite,
    title: 'Total Length',
    description: 'Total length of the apical dendrites',
    filter: null,
    vocabulary: {
      plural: 'Total Length',
      singular: 'Total Length',
    },
    render: (r) =>
      renderMorphologyMeasurement(
        r as IReconstructionMorphology,
        StructuralDomain.ApicalDendrite,
        'Total Length',
        'raw',
        true
      ),
  },
  [EntityCoreFields.ApicalDendtriteStrahlerNumber]: {
    group: StructuralDomain.ApicalDendrite,
    title: 'Strahler number',
    description: 'Apical Dendrite Strahler number',
    filter: null,
    vocabulary: {
      plural: 'Strahler number',
      singular: 'Strahler number',
    },
    render: (r) =>
      renderMorphologyMeasurement(
        r as IReconstructionMorphology,
        StructuralDomain.ApicalDendrite,
        'section_strahler_orders',
        'maximum'
      ),
  },
  [EntityCoreFields.ApicalArborAsymmetryIndex]: {
    group: StructuralDomain.ApicalDendrite,
    title: 'Arbor Asymmetry Index',
    description: 'Apical Arbor asymmetry index (if calculated)',
    filter: null,
    vocabulary: {
      plural: 'Arbor Asymmetry Index',
      singular: 'Arbor Asymmetry Index',
    },
    render: (r) =>
      renderMorphologyMeasurement(
        r as IReconstructionMorphology,
        StructuralDomain.ApicalDendrite,
        'partition_asymmetry',
        'mean'
      ),
  },
  [EntityCoreFields.NeuronMorphologyWidth]: {
    group: StructuralDomain.NeuronMorphology,
    title: 'Total Width',
    description: 'Neuron morphology total width',
    filter: null,
    vocabulary: {
      plural: 'Total Width',
      singular: 'Total Width',
    },
    render: (r) =>
      renderMorphologyMeasurement(
        r as IReconstructionMorphology,
        StructuralDomain.NeuronMorphology,
        'total_width',
        'raw',
        true
      ),
  },
  [EntityCoreFields.NeuronMorphologyHeight]: {
    group: StructuralDomain.NeuronMorphology,
    title: 'Total Height',
    description: 'Neuron morphology total height',
    filter: null,
    vocabulary: {
      plural: 'Total Height',
      singular: 'Total Height',
    },
    render: (r) =>
      renderMorphologyMeasurement(
        r as IReconstructionMorphology,
        StructuralDomain.NeuronMorphology,
        'total_height',
        'raw',
        true
      ),
  },
  [EntityCoreFields.NeuronMorphologyDepth]: {
    group: StructuralDomain.NeuronMorphology,
    title: 'Total Depth',
    description: 'Neuron morphology total depth',
    filter: null,
    vocabulary: {
      plural: 'Total Depth',
      singular: 'Total Depth',
    },
    render: (r) =>
      renderMorphologyMeasurement(
        r as IReconstructionMorphology,
        StructuralDomain.NeuronMorphology,
        'total_depth',
        'raw',
        true
      ),
  },
  [EntityCoreFields.SomaDiameter]: {
    group: StructuralDomain.Soma,
    title: 'Diameter',
    description: 'Diameter of the soma',
    filter: null,
    vocabulary: {
      plural: 'Diameter',
      singular: 'Diameter',
    },
    render: (r) =>
      renderMorphologyMeasurement(
        r as IReconstructionMorphology,
        'Soma',
        'soma_radius',
        'raw',
        true
      ),
  },
};
