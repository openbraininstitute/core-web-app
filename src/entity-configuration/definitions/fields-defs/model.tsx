import { LoadingOutlined, WarningFilled } from '@ant-design/icons';
import { find, isNil, map, omit, pick } from 'es-toolkit/compat';

import { hasAssets } from '@/api/entitycore/guards';
import {
  CircuitBuildCategory,
  CircuitScale,
  CircuitTargetSimulator,
} from '@/api/entitycore/types/entities/circuit';
import {
  CircuitDerivationFilterOptions,
  getCircuitDerivationColumnLabels,
} from '@/api/entitycore/types/entities/derivation';
import { ValidationStatus } from '@/api/entitycore/types/entities/me-model';
import { ElectrodeTypeDict } from '@/api/entitycore/types/entities/simulatable-extracellular-recording-array';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';
import {
  CoreFieldFilterTypeEnum,
  EntityCoreFields,
} from '@/entity-configuration/definitions/fields-defs/enums';
import {
  EmptyPreview,
  EmptyValue,
  RenderCustomField,
  renderDate,
  renderEmail,
  renderEmptyOrValue,
  renderFloatNumber,
  renderLocalizedNumber,
  renderPreview,
} from '@/entity-configuration/definitions/renderer';
import {
  type FieldsDefinitionRegistry,
  FilterOptionsSourceKind,
} from '@/entity-configuration/definitions/types';
import { countDeepSubCircuits } from '@/ui/segments/explore/circuit/helpers';
import { isNumber } from '@/util/type-guards';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { ISimulatableExtracellularRecordingArray } from '@/api/entitycore/types/entities/simulatable-extracellular-recording-array';
import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';
import type { ICircuitEnriched } from '@/ui/segments/explore/circuit/helpers';

function iCMBooleanField(title: string, field: keyof IonChannelModel) {
  return {
    className: 'text-left',
    isFilterable: true,
    title,
    filter: CoreFieldFilterTypeEnum.Boolean,
    defaultConstraint: field,
    isDisplayable: true,
    render: (r: EntityCoreObjectTypes) => ((r as IonChannelModel)[field] ? 'True' : 'False'),
  };
}

export const FieldsDefinition: Partial<FieldsDefinitionRegistry<EntityCoreObjectTypes>> = {
  [EntityCoreFields.EModelExemplarMorphology]: {
    title: 'Morphology',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => renderEmptyOrValue((r as IEModel).exemplar_morphology.name),
    vocabulary: {
      plural: 'Morphologies',
      singular: 'Morphology',
    },
    defaultConstraint: 'exemplar_morphology__label__in',
    isFilterable: false,
    isDisplayable: true,
    isSortable: true,
    order: [
      {
        types: [ExtendedEntitiesTypeDict.Emodel],
        property: 'order_by',
        value: 'exemplar_morphology__name',
      },
    ],
  },
  [EntityCoreFields.EModelScore]: {
    title: 'Model cumulated score',
    filter: null,
    render: (r) => renderEmptyOrValue(String(renderFloatNumber((r as IEModel).score))),
    vocabulary: {
      plural: 'Model cumulated score',
      singular: 'Model cumulated scores',
    },
    isFilterable: false,
    isDisplayable: true,
    isSortable: true,
    order: [
      {
        types: [ExtendedEntitiesTypeDict.Emodel],
        property: 'order_by',
        value: 'score',
      },
    ],
  },
  [EntityCoreFields.EModelResponse]: {
    title: 'Response',
    filter: null,
    render: (r) =>
      renderPreview(
        r as EntityCoreResource,
        { width: 184, height: 116 },
        'border border-neutral-3 h-full'
      ),
    vocabulary: {
      plural: 'responses',
      singular: 'response',
    },
    isSortable: false,
    isFilterable: false,
    isDisplayable: true,
    style: { width: 210 },
  },
  [EntityCoreFields.MEModelMorphologyPreview]: {
    className: 'text-center',
    title: 'Morphology',
    filter: null,
    render: (r) => {
      const { morphology } = r as IMEModel;
      if (hasAssets(morphology)) return renderPreview(morphology, { width: 196, height: 116 });
      return EmptyPreview;
    },
    vocabulary: {
      plural: 'Morphology',
      singular: 'Morphology',
    },
    style: { width: 196 },
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.MEModelTracePreview]: {
    className: 'text-center',
    title: 'Trace',
    filter: null,
    render: (r) =>
      renderPreview(
        r as EntityCoreResource,
        { width: 184, height: 116 },
        'border border-neutral-3 h-full'
      ),
    vocabulary: {
      plural: 'Trace',
      singular: 'Trace',
    },
    style: { width: 210 },
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.MEModelValidationStatus]: {
    className: 'text-left',
    title: 'Validated',
    filter: null,
    render: (r) => {
      return renderEmptyOrValue(
        (r as IMEModel).validation_status === ValidationStatus.Done ? 'True' : 'False'
      );
    },
    vocabulary: {
      plural: 'Validated',
      singular: 'Validated',
    },
    style: { width: 90, align: 'left' },
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.SynaptomeUsedMEModelName]: {
    className: 'text-left',
    title: 'ME-model',
    filter: null,
    isFilterable: true,
    isDisplayable: true,
    render: (r) => 'me_model' in r && r.me_model.name,
    vocabulary: {
      plural: 'ME-models',
      singular: 'ME-model',
    },
    style: { width: 184, align: 'left' },
  },
  [EntityCoreFields.CircuitNumberNeurons]: {
    title: 'Number of neurons',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    render: (r) => {
      return renderLocalizedNumber('number_neurons' in r ? r.number_neurons : null);
    },
    isDisplayable: true,
    isFilterable: true,
    isSortable: true,
    order: [
      {
        types: [
          ExtendedEntitiesTypeDict.Circuit,
          ExtendedEntitiesTypeDict.PairedNeuronCircuit,
          ExtendedEntitiesTypeDict.SmallMicrocircuit,
          ExtendedEntitiesTypeDict.Microcircuit,
          ExtendedEntitiesTypeDict.SingleNeuronCircuit,
        ],
        property: 'order_by',
        value: 'number_neurons',
      },
    ],
    defaultConstraint: {
      lte: 'number_neurons__lte',
      gte: 'number_neurons__gte',
    },
    style: { width: 85 },
  },
  [EntityCoreFields.CircuitNumberSynapses]: {
    title: 'Number of synapses',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    render: (r) => {
      return renderLocalizedNumber('number_synapses' in r ? r.number_synapses : null);
    },
    isDisplayable: true,
    isFilterable: true,
    isSortable: true,
    order: [
      {
        types: [
          ExtendedEntitiesTypeDict.Circuit,
          ExtendedEntitiesTypeDict.PairedNeuronCircuit,
          ExtendedEntitiesTypeDict.SmallMicrocircuit,
          ExtendedEntitiesTypeDict.Microcircuit,
          ExtendedEntitiesTypeDict.SingleNeuronCircuit,
        ],
        property: 'order_by',
        value: 'number_synapses',
      },
    ],
    defaultConstraint: {
      lte: 'number_synapses__lte',
      gte: 'number_synapses__gte',
    },
    style: { width: 85 },
  },
  [EntityCoreFields.CircuitNumberConnections]: {
    title: 'Number of connections',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    render: (r) => {
      return renderLocalizedNumber('number_connections' in r ? r.number_connections : null);
    },
    isDisplayable: true,
    isFilterable: true,
    isSortable: true,
    order: [
      {
        types: [
          ExtendedEntitiesTypeDict.Circuit,
          ExtendedEntitiesTypeDict.SingleNeuronCircuit,
          ExtendedEntitiesTypeDict.Microcircuit,
          ExtendedEntitiesTypeDict.PairedNeuronCircuit,
          ExtendedEntitiesTypeDict.SmallMicrocircuit,
        ],
        property: 'order_by',
        value: 'number_connections',
      },
    ],
    defaultConstraint: {
      lte: 'number_connections__lte',
      gte: 'number_connections__gte',
    },
    style: { width: 85 },
  },
  [EntityCoreFields.CircuitBuildCategory]: {
    className: 'text-left',
    title: 'Build category',
    filter: CoreFieldFilterTypeEnum.DropdownList,
    filterData: map(CircuitBuildCategory, (item) => ({
      label: item.label,
      value: item.key,
    })),
    isFilterable: true,
    isDisplayable: true,
    isSortable: true,
    order: [
      {
        types: [ExtendedEntitiesTypeDict.Circuit, ExtendedEntitiesTypeDict.SingleNeuronCircuit],
        property: 'order_by',
        value: 'build_category',
      },
    ],
    render: (r) =>
      renderEmptyOrValue(
        find(CircuitBuildCategory, { key: (r as ICircuit).build_category })?.label
      ),
    defaultConstraint: 'build_category__in',
    vocabulary: {
      plural: 'Build categories',
      singular: 'Build category',
    },
    style: { align: 'left' },
  },
  [EntityCoreFields.CircuitTargetSimulator]: {
    className: 'text-left',
    title: 'Target simulator',
    filter: CoreFieldFilterTypeEnum.DropdownList,
    filterData: map(CircuitTargetSimulator, (item) => ({
      label: item.label,
      value: item.key,
    })),
    isFilterable: true,
    isDisplayable: true,
    isSortable: true,
    order: [
      {
        types: [
          ExtendedEntitiesTypeDict.Circuit,
          ExtendedEntitiesTypeDict.SingleNeuronCircuit,
          ExtendedEntitiesTypeDict.PairedNeuronCircuit,
          ExtendedEntitiesTypeDict.SmallMicrocircuit,
          ExtendedEntitiesTypeDict.Microcircuit,
          ExtendedEntitiesTypeDict.WholeBrain,
        ],
        property: 'order_by',
        value: 'target_simulator',
      },
    ],
    render: (r) => {
      const targetSimulator = (r as ICircuit).target_simulator;
      return renderEmptyOrValue(
        targetSimulator ? find(CircuitTargetSimulator, { key: targetSimulator })?.label : undefined
      );
    },
    defaultConstraint: 'target_simulator__in',
    vocabulary: {
      plural: 'Target simulators',
      singular: 'Target simulator',
    },
    style: { align: 'left' },
  },
  [EntityCoreFields.CircuitDerivationType]: {
    className: 'text-left',
    title: 'Derivation type',
    // Static dropdown of the known circuit derivation types (issue #517). The backend exposes this
    // as a plain enum filter (not a facet), so the options are sourced statically. Adding a future
    // type = one entry in CircuitDerivationFilterOptions.
    filter: CoreFieldFilterTypeEnum.DropdownList,
    filterData: CircuitDerivationFilterOptions,
    isFilterable: true,
    isDisplayable: true,
    // Not sortable: the backend exposes no order_by for derivation type.
    defaultConstraint: 'generated_derivation__derivation_type__in',
    render: (r) => {
      // `generated_from_derivations` is loaded only on the flat list (expand=generated_from_derivations);
      // hierarchy/enriched rows omit it, so guard like CircuitSubCircuit does.
      const derivations =
        'generated_from_derivations' in r ? (r as ICircuit).generated_from_derivations : null;
      const labels = derivations ? getCircuitDerivationColumnLabels(derivations) : [];
      return labels.length ? labels.join(', ') : EmptyValue;
    },
    vocabulary: {
      plural: 'Derivation types',
      singular: 'Derivation type',
    },
    style: { align: 'left' },
  },
  [EntityCoreFields.CircuitScale]: {
    className: 'text-left',
    title: 'Scale',
    filter: CoreFieldFilterTypeEnum.DropdownList,
    isSortable: true,
    order: [
      {
        types: [
          ExtendedEntitiesTypeDict.Circuit,
          ExtendedEntitiesTypeDict.PairedNeuronCircuit,
          ExtendedEntitiesTypeDict.SmallMicrocircuit,
          ExtendedEntitiesTypeDict.Microcircuit,
          ExtendedEntitiesTypeDict.SingleNeuronCircuit,
        ],
        property: 'order_by',
        value: 'scale',
      },
    ],
    presentation: {
      column: {
        available: {
          default: false,
          rules: [
            {
              when: {
                dataType: [
                  ExtendedEntitiesTypeDict.Circuit,
                  ExtendedEntitiesTypeDict.PairedNeuronCircuit,
                  ExtendedEntitiesTypeDict.SmallMicrocircuit,
                  ExtendedEntitiesTypeDict.Microcircuit,
                  ExtendedEntitiesTypeDict.SingleNeuronCircuit,
                  ExtendedEntitiesTypeDict.BrainRegion,
                  ExtendedEntitiesTypeDict.WholeBrain,
                ],
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
                dataType: ExtendedEntitiesTypeDict.Circuit,
                section: [WorkspaceSection.Data],
              },
              value: true,
            },
            // enable scale filtering in the extracellular recording array build circuit browse
            {
              when: {
                dataType: ExtendedEntitiesTypeDict.Circuit,
                section: [WorkspaceSection.ScanConfigBuildWorkflow],
              },
              value: true,
            },
          ],
        },
        constraint: {
          rules: [
            {
              when: {
                dataType: ExtendedEntitiesTypeDict.Circuit,
                section: [WorkspaceSection.Data, WorkspaceSection.ScanConfigBuildWorkflow],
              },
              value: 'scale__in',
            },
          ],
        },
        // in the build ExtracellularRecordingArrayCampaign circuit browse the workflow caps the scales (single → microcircuit),
        // so the dropdown offers exactly those; everywhere else keeps the existing options (Single omitted)
        options: {
          kind: FilterOptionsSourceKind.Resolver,
          resolve: ({ context }) => {
            const scales =
              context.dataType === ExtendedEntitiesTypeDict.Circuit &&
              context.section === WorkspaceSection.ScanConfigBuildWorkflow
                ? pick(CircuitScale, ['Single', 'PairNeuron', 'SmallMicrocircuit', 'Microcircuit'])
                : omit(CircuitScale, ['Single']);
            return map(scales, (item) => ({ label: item.label, value: item.key }));
          },
        },
      },
    },
    render: (r) => renderEmptyOrValue(find(CircuitScale, { key: (r as ICircuit).scale })?.label),
    vocabulary: {
      plural: 'Scales',
      singular: 'Scale',
    },
    style: { width: 120, align: 'left' },
  },
  [EntityCoreFields.CircuitSubCircuit]: {
    className: 'text-left',
    title: 'Subcircuits',
    filter: null,
    isDisplayable: true,
    render: (r) => {
      if ('sub_circuits' in r) {
        return countDeepSubCircuits(r as ICircuitEnriched) || EmptyValue;
      }
      return EmptyValue;
    },
    vocabulary: {
      plural: 'Subcircuits',
      singular: 'Subcircuit',
    },
    style: { width: 80, align: 'left' },
  },
  [EntityCoreFields.ArtifactPublishedIn]: {
    className: 'text-left',
    title: 'Published in',
    filter: CoreFieldFilterTypeEnum.Text,
    isDisplayable: true,
    isSortable: true,
    isFilterable: true,
    render: (r) => renderEmptyOrValue((r as ICircuit).published_in),
    vocabulary: {
      plural: 'Published in',
      singular: 'Published in',
    },
    defaultConstraint: 'published_in__ilike',
    order: [
      {
        types: [ExtendedEntitiesTypeDict.Circuit],
        property: 'order_by',
        value: 'published_in',
      },
    ],
  },
  [EntityCoreFields.ArtifactExperimentDate]: {
    className: 'text-left',
    title: 'Experiment date',
    filter: CoreFieldFilterTypeEnum.DateRange,
    isDisplayable: true,
    isSortable: true,
    isFilterable: true,
    render: (r) => renderDate((r as ICircuit).experiment_date),
    vocabulary: {
      plural: 'Experiment dates',
      singular: 'Experiment dates',
    },
    defaultConstraint: {
      gte: 'experiment_date__gte',
      lte: 'experiment_date__lte',
    },
    order: [
      {
        types: [ExtendedEntitiesTypeDict.Circuit],
        property: 'order_by',
        value: 'experiment_date',
      },
    ],
  },
  [EntityCoreFields.ArtifactContactEmail]: {
    className: 'text-left',
    title: 'Contact email',
    filter: null,
    isDisplayable: true,
    render: (r, _, variant) =>
      renderEmptyOrValue(renderEmail((r as ICircuit).contact_email, variant)),
    vocabulary: {
      plural: 'Contact emails',
      singular: 'Contact email',
    },
  },
  [EntityCoreFields.CircuitRootCircuit]: {
    className: 'text-left',
    title: 'Root circuit',
    filter: null,
    isDisplayable: true,
    renderForDetailView: (r) => {
      if ('root_circuit_id' in r && !isNil(r.root_circuit_id))
        return (
          <RenderCustomField<ICircuit>
            entityId={r.root_circuit_id}
            entityType={ExtendedEntitiesTypeDict.Circuit}
            CustomComponent={({ data, loading, error }) => {
              if (loading) return <LoadingOutlined spin />;
              if (error) return <WarningFilled className="text-amber-300" />;
              return <>{data?.name}</>;
            }}
          />
        );

      return EmptyValue;
    },
    render: () => null,
    vocabulary: {
      plural: 'Registration Dates',
      singular: 'Registration Date',
    },
  },
  [EntityCoreFields.IsLjpCorrected]: {
    ...iCMBooleanField('LJP corrected', 'is_ljp_corrected'),
    isSortable: true,
    order: [
      {
        types: [ExtendedEntitiesTypeDict.IonChannelModel],
        property: 'order_by',
        value: 'is_ljp_corrected',
      },
    ],
  },
  [EntityCoreFields.IsStochastic]: {
    ...iCMBooleanField('Stochastic', 'is_stochastic'),
    isSortable: true,
    order: [
      {
        types: [ExtendedEntitiesTypeDict.IonChannelModel],
        property: 'order_by',
        value: 'is_stochastic',
      },
    ],
  },
  [EntityCoreFields.IsTemperatureDependent]: {
    ...iCMBooleanField('Temperature dependent', 'is_temperature_dependent'),
    isSortable: true,
    order: [
      {
        types: [ExtendedEntitiesTypeDict.IonChannelModel],
        property: 'order_by',
        value: 'is_temperature_dependent',
      },
    ],
  },
  [EntityCoreFields.TemperatureCelsius]: {
    className: 'text-left',
    title: 'Temperature (°C)',
    isFilterable: true,
    filter: CoreFieldFilterTypeEnum.ValueOrRange,
    isDisplayable: true,
    isSortable: true,
    defaultConstraint: 'temperature_celsius',
    order: [
      {
        types: [ExtendedEntitiesTypeDict.IonChannelModel],
        property: 'order_by',
        value: 'temperature_celsius',
      },
    ],
    render: (r) => {
      if (
        EntityCoreFields.TemperatureCelsius in r &&
        isNumber(r[EntityCoreFields.TemperatureCelsius])
      )
        return `${r[EntityCoreFields.TemperatureCelsius]} °C`;
      return EmptyValue;
    },
  },
  [EntityCoreFields.ElectrodeType]: {
    className: 'text-left',
    title: 'Electrode type',
    filter: CoreFieldFilterTypeEnum.DropdownList,
    isSortable: true,
    presentation: {
      column: {
        available: {
          default: false,
          rules: [
            {
              when: { dataType: ExtendedEntitiesTypeDict.SimulatableExtracellularRecordingArray },
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
                dataType: ExtendedEntitiesTypeDict.SimulatableExtracellularRecordingArray,
                section: [WorkspaceSection.Data],
              },
              value: true,
            },
          ],
        },
        constraint: {
          rules: [
            {
              when: {
                dataType: ExtendedEntitiesTypeDict.SimulatableExtracellularRecordingArray,
                section: [WorkspaceSection.Data],
              },
              value: 'electrode_type',
            },
          ],
        },
        options: {
          kind: FilterOptionsSourceKind.Static,
          items: map(ElectrodeTypeDict, (item) => ({
            label: item.label,
            value: item.key,
          })),
        },
      },
    },
    render: (r) =>
      renderEmptyOrValue(
        find(ElectrodeTypeDict, {
          key: (r as ISimulatableExtracellularRecordingArray).electrode_type,
        })?.label
      ),
    vocabulary: {
      plural: 'Electrode types',
      singular: 'Electrode type',
    },
    style: { align: 'left' },
  },
  [EntityCoreFields.RecordingArrayCircuit]: {
    className: 'text-left',
    title: 'Circuit',
    filter: null,
    presentation: {
      column: {
        available: {
          default: false,
          rules: [
            {
              when: { dataType: ExtendedEntitiesTypeDict.SimulatableExtracellularRecordingArray },
              value: true,
            },
          ],
        },
      },
    },
    render: (r) => renderEmptyOrValue((r as ISimulatableExtracellularRecordingArray).circuit_id),
  },
};
