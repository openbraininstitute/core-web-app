import { Button } from 'antd';

import { makeCustomRowSelectionEvent } from '@/components/explore-section/ExploreSectionListingView/expandable-row/custom-row-selection-event';
import { transformAgentToNames } from '@/api/entitycore/transformers';
import { DataType } from '@/constants/explore-section/list-views';
import { hasAssets } from '@/api/entitycore/guards';
import {
  CoreFieldFilterTypeEnum,
  EntityCoreFields,
} from '@/entity-configuration/definitions/fields-defs/enums';
import {
  EmptyPreview,
  EmptyValue,
  renderContributorsModal,
  renderDate,
  renderEmptyOrValue,
  renderPreview,
  renderTimestamp,
} from '@/entity-configuration/definitions/renderer';
import { DownloadIcon } from '@/components/icons';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { IContributor } from '@/api/entitycore/types/shared/global';
import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';

export type ProcessedContributor = {
  name: string;
  type: number; // 0 for Org, 1 for Person
};

export const FieldsDefinition: Partial<FieldsDefinitionRegistry<EntityCoreObjectTypes>> = {
  [EntityCoreFields.Preview]: {
    className: 'text-center',
    title: 'Preview',
    filter: null,
    render: (r) => {
      if (hasAssets(r))
        return renderPreview(r, { width: 184, height: 116 }, 'border border-neutral-3 h-full');
      return EmptyPreview;
    },
    vocabulary: {
      plural: 'previews',
      singular: 'preview',
    },
    style: { width: 194 },
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.Download]: {
    className: 'text-center',
    title: <DownloadIcon className="index-column text-current" />,
    description: 'Download item',
    filter: null,
    render: (record) => {
      const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        e.preventDefault();
        makeCustomRowSelectionEvent({ record });
      };
      return (
        <Button className="p-2" type="text" htmlType="button" onClick={onClick}>
          <DownloadIcon className="text-current" />
        </Button>
      );
    },
    style: { width: 50, fixed: 'left', align: 'center' },
    isFilterable: false,
    isDisplayable: false,
    isSortable: false,
  },
  [EntityCoreFields.Name]: {
    title: 'Name',
    description: 'Name of the entity',
    filter: CoreFieldFilterTypeEnum.Text,
    render: (r) => renderEmptyOrValue(r.name),
    vocabulary: {
      plural: 'Names',
      singular: 'Name',
    },
    defaultConstraint: 'name__ilike',
    isSortable: true,
    order: {
      property: 'order_by',
      value: 'name',
    },
    isFilterable: true,
    isDisplayable: true,
    style: { width: 180 },
  },
  [EntityCoreFields.CreationDate]: {
    title: 'Creation date',
    filter: CoreFieldFilterTypeEnum.DateRange,
    render: (r) => renderDate(r.creation_date),
    vocabulary: {
      plural: 'Dates',
      singular: 'Date',
    },
    defaultConstraint: {
      gte: 'creation_date__gte',
      lte: 'creation_date__lte',
    },
    isSortable: true,
    order: {
      property: 'order_by',
      value: 'creation_date',
    },
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.RegistrationDate]: {
    title: 'Registration date',
    filter: CoreFieldFilterTypeEnum.DateRange,
    render: (r) => renderDate(r.creation_date),
    vocabulary: {
      plural: 'Dates',
      singular: 'Date',
    },
    defaultConstraint: {
      gte: 'creation_date__gte',
      lte: 'creation_date__lte',
    },
    isSortable: true,
    order: {
      property: 'order_by',
      value: 'creation_date',
    },
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.UpdateDate]: {
    title: 'Update date',
    filter: CoreFieldFilterTypeEnum.DateRange,
    render: (r) => renderTimestamp(new Date(r.update_date)),
    vocabulary: {
      plural: 'Dates',
      singular: 'Date',
    },
    defaultConstraint: {
      gte: 'update_date__gte',
      lte: 'update_date__lte',
    },
    isSortable: true,
    order: {
      property: 'order_by',
      value: 'updated_at',
    },
    isFilterable: false,
    isDisplayable: false,
  },
  [EntityCoreFields.Description]: {
    title: 'Description',
    filter: CoreFieldFilterTypeEnum.Text,
    render: (r) => renderEmptyOrValue(r.description),
    vocabulary: {
      plural: 'Descriptions',
      singular: 'Description',
    },
    defaultConstraint: 'search',
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.Contributions]: {
    title: 'Contributors',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) =>
      transformAgentToNames(
        (r as EntityCoreObjectTypes & { contributions?: Array<IContributor> | null }).contributions,
        false
      ),
    renderForDetailView: (r) => {
      const { contributions } = r as EntityCoreObjectTypes & {
        contributions?: Array<IContributor> | null;
      };
      return renderContributorsModal(contributions, false, () => {}, 'inline');
    },
    vocabulary: {
      plural: 'Contributors',
      singular: 'Contributor',
    },
    defaultConstraint: 'contribution__pref_label__in',
    order: {
      property: 'contribution__order_by',
      value: 'pref_label',
    },
    isSortable: false,
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.BrainRegion]: {
    title: 'Brain Region',
    filter: null,
    render: (r) => renderEmptyOrValue('brain_region' in r ? r.brain_region.name : ''),
    vocabulary: {
      plural: 'Brain Regions',
      singular: 'Brain Region',
    },
    defaultConstraint: 'brain_region_id',
    isFilterable: false,
    isDisplayable: true,
    isSortable: true,
    order: [
      {
        types: [
          DataType.ExperimentalNeuronMorphology,
          DataType.ExperimentalElectroPhysiology,
          DataType.ExperimentalBoutonDensity,
          DataType.ExperimentalNeuronDensity,
          DataType.ExperimentalSynapsePerConnection,
          DataType.CircuitMEModel,
          DataType.CircuitEModel,
          DataType.SingleNeuronSimulation,
          DataType.SingleNeuronSynaptome,
          DataType.SingleNeuronSynaptomeSimulation,
        ],
        property: 'order_by',
        value: 'brain_region__name',
      },
    ],
  },
  [EntityCoreFields.CreatedBy]: {
    title: 'Created by',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => {
      if ('created_by' in r) return renderEmptyOrValue(r.created_by?.pref_label);
      return EmptyValue;
    },
    vocabulary: {
      plural: 'Users',
      singular: 'User',
    },
    defaultConstraint: 'created_by__pref_label__in',
    isDisplayable: true,
    isFilterable: true,
    isSortable: true,
    order: [
      {
        types: [
          DataType.CircuitMEModel,
          DataType.SingleNeuronSynaptome,
          DataType.SingleNeuronSimulation,
          DataType.SingleNeuronSynaptomeSimulation,
        ],
        property: 'order_by',
        value: 'created_by__pref_label',
      },
    ],
  },
  [EntityCoreFields.UpdatedBy]: {
    title: 'Updated by',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => {
      if ('updated_by' in r) return renderEmptyOrValue(r.updated_by?.pref_label);
      return EmptyValue;
    },
    vocabulary: {
      plural: 'Users',
      singular: 'User',
    },
    defaultConstraint: 'updated_by__pref_label__in',
    isDisplayable: true,
  },
};
