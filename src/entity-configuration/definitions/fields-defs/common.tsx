import { Button } from 'antd';
import { useAtom } from 'jotai';

import { transformAgentToNames } from '@/api/entitycore/transformers';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
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
import { downloadPanelCircuitAtom } from '@/ui/segments/explore/circuit/elements/download-panel';

import { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { EntityTypeValue } from '@/entity-configuration/domain';

const renderContributors = (r: EntityTypeValue, filter: 'person' | 'organization') => {
  if (!('contributions' in r) || !r.contributions) return EmptyValue;

  const filteredContributions = r.contributions.filter(
    (c) => c.agent.type === 'consortium' || c.agent.type === filter
  );

  if (!filteredContributions || filteredContributions.length === 0) return EmptyValue;
  return renderContributorsModal(filteredContributions, false, () => {}, 'inline');
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
      return <DownloadButton entity={record} />;
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
    renderForDetailView: (r) => renderContributors(r, 'person'),
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
  [EntityCoreFields.InstitutionalContributions]: {
    title: 'Institutional Contributors',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) =>
      transformAgentToNames(
        (r as EntityCoreObjectTypes & { contributions?: Array<IContributor> | null }).contributions,
        false
      ),
    renderForDetailView: (r) => renderContributors(r, 'organization'),
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
          ExtendedEntitiesTypeDict.CellMorphology,
          ExtendedEntitiesTypeDict.ElectricalCellRecording,
          ExtendedEntitiesTypeDict.ExperimentalBoutonDensity,
          ExtendedEntitiesTypeDict.ExperimentalNeuronDensity,
          ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection,
          ExtendedEntitiesTypeDict.Memodel,
          ExtendedEntitiesTypeDict.Emodel,
          ExtendedEntitiesTypeDict.SingleNeuronSimulation,
          ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
          ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
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
          ExtendedEntitiesTypeDict.Memodel,
          ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
          ExtendedEntitiesTypeDict.SingleNeuronSimulation,
          ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
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
  [EntityCoreFields.IonChannel]: {
    title: 'Ion Channel',
    description: 'Name of ion channel',
    filter: CoreFieldFilterTypeEnum.Text,
    render: (r) => renderEmptyOrValue(r.name),
    vocabulary: {
      plural: 'ion channels',
      singular: 'Ion channel',
    },
    defaultConstraint: 'ion_channel__ilike',
    isSortable: true,
    order: {
      property: 'order_by',
      value: 'ion_channel',
    },
    isFilterable: true,
    isDisplayable: true,
  },
};

function DownloadButton({ entity }: { entity: EntityCoreObjectTypes }) {
  const [, setDownloadPanelCircuit] = useAtom(downloadPanelCircuitAtom);

  return (
    <Button
      className="p-2"
      type="text"
      htmlType="button"
      onClick={(e) => {
        const { type } = entity;
        if (type !== 'circuit') return;

        e.stopPropagation();
        e.preventDefault();

        setDownloadPanelCircuit(entity as ICircuit);
      }}
    >
      <DownloadIcon className="text-current" />
    </Button>
  );
}
