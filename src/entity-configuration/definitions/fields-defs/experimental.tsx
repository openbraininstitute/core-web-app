import { map } from 'es-toolkit/compat';
import find from 'es-toolkit/compat/find';
import isEmpty from 'es-toolkit/compat/isEmpty';

import { isMemodel, isSingleNeuronSynaptome } from '@/api/entitycore/guards';
import {
  CellMorphologyGenerationType,
  CellMorphologyProtocolDesign,
} from '@/api/entitycore/types/entities/cell-morphology-protocol';
import {
  EMCellMeshGenerationMethodDict,
  EMCellMeshTypeDict,
  type IEMCellMesh,
} from '@/api/entitycore/types/entities/em-cell-mesh';
import { StructuralDomain } from '@/api/entitycore/types/entities/measurement-annotation';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { type IEType, type IMType, MeasurementUnit } from '@/api/entitycore/types/shared/global';
import { WorkspaceSection } from '@/constants';
import {
  CoreFieldFilterTypeEnum,
  EntityCoreFields,
} from '@/entity-configuration/definitions/fields-defs/enums';
import getMeasurements, {
  EmptyValue,
  renderArray,
  renderAsString,
  renderEmptyOrValue,
  renderFloatNumber,
  renderLicense,
  renderMeanStd,
  renderMorphologyMeasurement,
} from '@/entity-configuration/definitions/renderer';
import { CoreFieldType } from '@/entity-configuration/definitions/types';
import { ensureString, isNumber, isString } from '@/util/type-guards';
import { ensureArray } from '@/utils/array';

import type {
  EntityCoreDensityObjectTypes,
  EntityCoreObjectTypes,
  ICellMorphology,
  IEModel,
} from '@/api/entitycore/types';
import type { IExperimentalSynapsesPerConnection } from '@/api/entitycore/types/entities/synapses-per-connection';
import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';

const morphologyMtypes = (morphology?: ICellMorphology) => {
  if (!morphology) return [];
  return renderArray(morphology.mtypes?.map((m) => m.pref_label) || []);
};

const emodelEtypes = (emodel?: IEModel) => {
  if (!emodel) return [];
  return renderArray(emodel.etypes?.map((m) => m.pref_label) || []);
};

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
  [EntityCoreFields.GenerationType]: {
    title: 'Generation type',
    filter: CoreFieldFilterTypeEnum.DropdownList,
    presentation: {
      column: {
        available: {
          default: false,
          rules: [
            {
              when: {
                dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
                section: WorkspaceSection.BuildWorkflow,
              },
              value: true,
            },
          ],
        },
      },
      filter: {
        available: {
          default: false,
          rules: [
            {
              when: {
                dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
                section: WorkspaceSection.BuildWorkflow,
              },
              value: true,
            },
          ],
        },
        constraint: {
          rules: [
            {
              when: {
                dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
                section: WorkspaceSection.BuildWorkflow,
              },
              value: 'cell_morphology_protocol__generation_type__in',
            },
          ],
        },
        options: {
          kind: 'static',
          items: map(CellMorphologyGenerationType, (item) => ({
            label: item.label,
            value: item.key,
            description: item.description,
          })),
        },
      },
    },
    render: (entity) => {
      if ('cell_morphology_protocol' in entity) {
        return renderEmptyOrValue(
          find(CellMorphologyGenerationType, {
            key: entity.cell_morphology_protocol.generation_type,
          })?.label
        );
      }

      return EmptyValue;
    },
    vocabulary: {
      plural: 'Generation types',
      singular: 'Generation type',
    },
    isSortable: true,
    order: {
      property: 'order_by',
      value: ['cell_morphology_protocol__generation_type'],
    },
    style: { width: 190 },
  },
  [EntityCoreFields.ProtocolDesign]: {
    title: 'Protocol design',
    filter: CoreFieldFilterTypeEnum.DropdownList,
    presentation: {
      column: {
        available: {
          default: false,
          rules: [
            {
              when: {
                dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
                section: WorkspaceSection.BuildWorkflow,
              },
              value: true,
            },
          ],
        },
      },
      filter: {
        available: {
          default: false,
          rules: [
            {
              when: {
                dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
                section: WorkspaceSection.BuildWorkflow,
              },
              value: true,
            },
          ],
        },
        constraint: {
          rules: [
            {
              when: {
                dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
                section: WorkspaceSection.BuildWorkflow,
              },
              value: 'cell_morphology_protocol__protocol_design__in',
            },
          ],
        },
        options: {
          kind: 'static',
          items: map(CellMorphologyProtocolDesign, (item) => ({
            label: item.label,
            value: item.key,
            description: item.description,
          })),
        },
      },
    },
    render: (entity) => {
      if (
        'cell_morphology_protocol' in entity &&
        'protocol_design' in entity.cell_morphology_protocol
      ) {
        return renderEmptyOrValue(
          find(CellMorphologyProtocolDesign, {
            key: entity.cell_morphology_protocol.protocol_design,
          })?.label
        );
      }

      return EmptyValue;
    },
    vocabulary: {
      plural: 'Protocol designs',
      singular: 'Protocol design',
    },
    style: { width: 190 },
  },
  [EntityCoreFields.MType]: {
    fieldType: CoreFieldType.CellType,
    title: 'M-Type',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render(r: EntityCoreObjectTypes) {
      if (isSingleNeuronSynaptome(r)) {
        return renderEmptyOrValue(
          renderArray(
            (r.me_model.mtypes &&
              r.me_model.mtypes.length > 0 &&
              r.me_model.mtypes.map((m) => m.pref_label)) ||
              morphologyMtypes(r.me_model.morphology)
          )
        );
      }
      if (isMemodel(r) && isEmpty(r.etypes)) {
        return morphologyMtypes(r.morphology);
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
    perTypeConstraint: {
      [ExtendedEntitiesTypeDict.SingleNeuronSynaptome]: 'me_model__mtype__pref_label__in',
    },
    order: [
      {
        types: [
          ExtendedEntitiesTypeDict.ExperimentalBoutonDensity,
          ExtendedEntitiesTypeDict.ExperimentalNeuronDensity,
          ExtendedEntitiesTypeDict.CellMorphology,
          ExtendedEntitiesTypeDict.Emodel,
          ExtendedEntitiesTypeDict.Memodel,
        ],
        property: 'order_by',
        value: 'mtype__pref_label',
      },
      {
        types: [ExtendedEntitiesTypeDict.SingleNeuronSynaptome],
        property: 'order_by',
        value: 'me_model__mtype__pref_label',
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
    render(r: EntityCoreObjectTypes) {
      if (isSingleNeuronSynaptome(r)) {
        return renderEmptyOrValue(
          renderArray(
            (r.me_model.etypes &&
              r.me_model.etypes.length > 0 &&
              r.me_model.etypes.map((m) => m.pref_label)) ||
              emodelEtypes(r.me_model.emodel)
          )
        );
      }
      if (isMemodel(r) && isEmpty(r.etypes)) {
        return emodelEtypes(r.emodel);
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
    perTypeConstraint: {
      [ExtendedEntitiesTypeDict.SingleNeuronSynaptome]: 'me_model__etype__pref_label__in',
    },
    order: [
      {
        types: [
          ExtendedEntitiesTypeDict.ElectricalCellRecording,
          ExtendedEntitiesTypeDict.Emodel,
          ExtendedEntitiesTypeDict.IonChannelRecording,
          ExtendedEntitiesTypeDict.ExperimentalNeuronDensity,
          ExtendedEntitiesTypeDict.Memodel,
        ],
        property: 'order_by',
        value: 'etype__pref_label',
      },
      {
        types: [ExtendedEntitiesTypeDict.SingleNeuronSynaptome],
        property: 'order_by',
        value: 'me_model__etype__pref_label',
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
          unit: MeasurementUnit.dimensionless,
        })?.value
      );
    },
    vocabulary: {
      plural: 'Values',
      singular: 'Value',
    },
    isSortable: true,
    order: [
      {
        types: [ExtendedEntitiesTypeDict.ExperimentalBoutonDensity],
        property: 'order_by',
        value: 'measurement_sample_size__value',
      },
    ],
    isFilterable: false,
    isDisplayable: true,
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
    isSortable: true,
    order: [
      {
        types: [ExtendedEntitiesTypeDict.ExperimentalBoutonDensity],
        property: 'order_by',
        value: 'measurement_mean__value',
      },
    ],
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
    isSortable: true,
    order: [
      {
        types: [ExtendedEntitiesTypeDict.ExperimentalBoutonDensity],
        property: 'order_by',
        value: 'measurement_standard_error__value',
      },
    ],
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
    isSortable: true,
    order: [
      {
        types: [ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection],
        property: 'order_by',
        value: 'pre_region__name',
      },
    ],
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
    isSortable: true,
    order: [
      {
        types: [ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection],
        property: 'order_by',
        value: 'post_region__name',
      },
    ],
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
    isSortable: true,
    order: [
      {
        types: [ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection],
        property: 'order_by',
        value: 'pre_mtype__pref_label',
      },
    ],
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
    isSortable: true,
    order: [
      {
        types: [ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection],
        property: 'order_by',
        value: 'post_mtype__pref_label',
      },
    ],
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
        r as ICellMorphology,
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
        r as ICellMorphology,
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
        r as ICellMorphology,
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
        r as ICellMorphology,
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
        r as ICellMorphology,
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
        r as ICellMorphology,
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
        r as ICellMorphology,
        StructuralDomain.ApicalDendrite,
        'total_length',
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
        r as ICellMorphology,
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
        r as ICellMorphology,
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
        r as ICellMorphology,
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
        r as ICellMorphology,
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
        r as ICellMorphology,
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
        r as ICellMorphology,
        StructuralDomain.Soma,
        'soma_radius',
        'raw',
        true
      ),
  },
  [EntityCoreFields.IonChannel]: {
    className: 'text-left',
    title: 'Ion channel',
    isFilterable: true,
    filter: CoreFieldFilterTypeEnum.Text,
    isDisplayable: true,
    isSortable: true,
    render: (r) => {
      const ionChannel = 'ion_channel' in r ? (r.ion_channel as Record<string, unknown>) : {};
      const name = ensureString(ionChannel.name, EmptyValue);
      return name;
    },
    defaultConstraint: 'ion_channel__name__ilike',
    order: [
      {
        types: [ExtendedEntitiesTypeDict.IonChannelRecording],
        property: 'order_by',
        value: 'ion_channel__name',
      },
    ],
  },
  [EntityCoreFields.Temperature]: {
    className: 'text-left',
    title: 'Temperature (°C)',
    isFilterable: true,
    filter: CoreFieldFilterTypeEnum.ValueOrRange,
    isDisplayable: true,
    isSortable: true,
    render: (r) => {
      const temperature =
        EntityCoreFields.Temperature in r ? (r[EntityCoreFields.Temperature] as number) : null;
      return isNumber(temperature) || isString(temperature) ? `${temperature} °C` : EmptyValue;
    },
    defaultConstraint: 'temperature',
    order: [
      {
        types: [ExtendedEntitiesTypeDict.IonChannelRecording],
        property: 'order_by',
        value: 'temperature',
      },
    ],
  },
  [EntityCoreFields.CellLine]: {
    className: 'text-left',
    title: 'Cell line',
    isFilterable: true,
    filter: CoreFieldFilterTypeEnum.Text,
    isDisplayable: true,
    isSortable: true,
    render: (r) => {
      const cellLine = ensureString('cell_line' in r ? r.cell_line : null, '—');
      return cellLine;
    },
    defaultConstraint: 'cell_line__ilike',
    order: [
      {
        types: [ExtendedEntitiesTypeDict.IonChannelRecording],
        property: 'order_by',
        value: 'cell_line',
      },
    ],
  },
  [EntityCoreFields.DenseReconstructionCellId]: {
    className: 'text-left',
    title: 'Dense reconstruction cell Id',
    isFilterable: true,
    filter: CoreFieldFilterTypeEnum.Text,
    isDisplayable: true,
    isSortable: false,
    render: (r) => {
      const cellLine = ensureString('cell_line' in r ? r.cell_line : null, '—');
      return cellLine;
    },
    defaultConstraint: 'cell_line__ilike',
  },
  [EntityCoreFields.GenerationMethod]: {
    className: 'text-left',
    title: 'Generation method',
    isFilterable: true,
    filter: CoreFieldFilterTypeEnum.Text,
    isDisplayable: true,
    isSortable: false,
    render: (r) => {
      const entity = r as IEMCellMesh;
      if ('generation_method' in entity)
        return renderEmptyOrValue(
          find(EMCellMeshGenerationMethodDict, { key: entity.generation_method })?.label
        );
      return EmptyValue;
    },
  },
  [EntityCoreFields.LevelOfDetail]: {
    className: 'text-left',
    title: 'Level of detail',
    isFilterable: true,
    filter: CoreFieldFilterTypeEnum.ValueOrRange,
    isDisplayable: true,
    isSortable: false,
    render: (r) => {
      const entity = r as IEMCellMesh;
      if ('level_of_detail' in entity)
        return renderEmptyOrValue(renderAsString(entity.level_of_detail));
      return EmptyValue;
    },
    defaultConstraint: 'level_of_detail',
  },
  [EntityCoreFields.MeshType]: {
    className: 'text-left',
    title: 'Mesh type',
    isFilterable: true,
    filter: CoreFieldFilterTypeEnum.DropdownList,
    filterData: map(EMCellMeshTypeDict, (item) => ({
      label: item.label,
      value: item.key,
    })),
    isDisplayable: true,
    isSortable: true,
    order: [
      {
        types: [ExtendedEntitiesTypeDict.EMCellMesh],
        property: 'order_by',
        value: 'mesh_type',
      },
    ],
    render: (r) => {
      const entity = r as IEMCellMesh;
      if ('mesh_type' in entity) {
        return renderEmptyOrValue(find(EMCellMeshTypeDict, { key: entity.mesh_type })?.label);
      }
      return EmptyValue;
    },
    defaultConstraint: 'mesh_type',
  },
};
