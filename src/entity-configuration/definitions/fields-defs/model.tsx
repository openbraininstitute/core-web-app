import { LoadingOutlined, WarningFilled } from '@ant-design/icons';
import isNil from 'es-toolkit/compat/isNil';
import find from 'es-toolkit/compat/find';
import map from 'es-toolkit/compat/map';

import { CircuitBuildCategory, CircuitScale } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { countDeepSubCircuits } from '@/ui/segments/explore/circuit/helpers';
import { ValidationStatus } from '@/api/entitycore/types/entities/me-model';
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
  CoreFieldFilterTypeEnum,
  EntityCoreFields,
} from '@/entity-configuration/definitions/fields-defs/enums';
import { hasAssets } from '@/api/entitycore/guards';

import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';
import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';
import type { ICircuitEnriched } from '@/ui/segments/explore/circuit/helpers';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import { isNumber } from '@/util/type-guards';

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
  [EntityCoreFields.CircuitScale]: {
    className: 'text-left',
    title: 'Scale',
    filter: CoreFieldFilterTypeEnum.DropdownList,
    filterData: map(CircuitScale, (item) => ({
      label: item.label,
      value: item.key,
    })),
    defaultConstraint: 'scale__in',
    isFilterable: true,
    isDisplayable: true,
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
  [EntityCoreFields.CircuitPublishedIn]: {
    className: 'text-left',
    title: 'Published in',
    filter: null,
    isDisplayable: true,
    render: (r) => renderEmptyOrValue((r as ICircuit).published_in),
    vocabulary: {
      plural: 'Published in',
      singular: 'Published in',
    },
  },
  [EntityCoreFields.CircuitExperimentDate]: {
    className: 'text-left',
    title: 'Registration Date',
    filter: null,
    isDisplayable: true,
    render: (r) => renderDate((r as ICircuit).experiment_date),
    vocabulary: {
      plural: 'Registration Date',
      singular: 'Registration Date',
    },
  },
  [EntityCoreFields.CircuitContactEmail]: {
    className: 'text-left',
    title: 'Contact email',
    filter: null,
    isDisplayable: true,
    render: (r) => renderEmptyOrValue(renderEmail((r as ICircuit).contact_email)),
    vocabulary: {
      plural: 'Registration Date',
      singular: 'Registration Date',
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
      plural: 'Registration Date',
      singular: 'Registration Date',
    },
  },
  [EntityCoreFields.IsLjpCorrected]: iCMBooleanField('LJP corrected', 'is_ljp_corrected'),
  [EntityCoreFields.IsStochastic]: iCMBooleanField('Stochastic', 'is_stochastic'),
  [EntityCoreFields.IsTemperatureDependent]: iCMBooleanField(
    'Temperature dependent',
    'is_temperature_dependent'
  ),
  [EntityCoreFields.Temperature]: {
    className: 'text-left',
    title: 'Temperature (°C)',
    isFilterable: true,
    filter: CoreFieldFilterTypeEnum.ValueRange,
    isDisplayable: true,
    isSortable: true,
    defaultConstraint: {
      lte: 'temperature__lte',
      gte: 'temperature__gte',
    },
    render: (r) => {
      if (EntityCoreFields.Temperature in r && isNumber(r[EntityCoreFields.Temperature]))
        return `${r[EntityCoreFields.Temperature]} °C`;
      return EmptyValue;
    },
  },
};
