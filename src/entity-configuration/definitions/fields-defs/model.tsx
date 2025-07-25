import find from 'lodash/find';

import map from 'lodash/map';
import { CircuitBuildCategory, CircuitScale } from '@/api/entitycore/types/entities/circuit';
import { ValidationStatus } from '@/api/entitycore/types/entities/me-model';
import { DataType } from '@/constants/explore-section/list-views';
import {
  EmptyPreview,
  renderEmptyOrValue,
  renderFloatNumber,
  renderPreview,
} from '@/entity-configuration/definitions/renderer';
import {
  CoreFieldFilterTypeEnum,
  EntityCoreFields,
} from '@/entity-configuration/definitions/fields-defs/enums';
import { hasAssets } from '@/api/entitycore/guards';

import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

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
        types: [DataType.CircuitEModel],
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
        types: [DataType.CircuitEModel],
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
    title: 'N° of neurons',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    render: (r) => {
      return 'number_neurons' in r ? r.number_neurons : '-';
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
    title: 'N° of synapses',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    render: (r) => {
      return 'number_synapses' in r ? r.number_synapses : '-';
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
    title: 'N° of connections',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    render: (r) => {
      return 'number_connections' in r ? r.number_connections : '-';
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
    render: (r) => renderEmptyOrValue((r as ICircuit).sub_circuits?.length),
    vocabulary: {
      plural: 'Subcircuits',
      singular: 'Subcircuit',
    },
    style: { width: 80, align: 'left' },
  },
  [EntityCoreFields.CircuitSubCircuitOf]: {
    className: 'text-left',
    title: 'Subcircuit of',
    filter: null,
    isDisplayable: true,
    render: (r) => renderEmptyOrValue((r as ICircuit).sub_circuits?.length),
    vocabulary: {
      plural: 'Subcircuit of',
      singular: 'Subcircuit of',
    },
    style: { width: 80, align: 'left' },
  },
};
