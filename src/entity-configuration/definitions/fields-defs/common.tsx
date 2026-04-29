import { Button } from 'antd';
import get from 'es-toolkit/compat/get';
import isNil from 'es-toolkit/compat/isNil';
import { useAtom } from 'jotai';

import { hasAssets } from '@/api/entitycore/guards';
import { transformAgentToNames } from '@/api/entitycore/transformers';
import { EntityTypeDict } from '@/api/entitycore/types';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AgentType, AssetLabel } from '@/api/entitycore/types/shared/global';
import { DownloadIcon } from '@/components/icons';
import { WorkspaceSection } from '@/constants';
import {
  CoreFieldFilterTypeEnum,
  EntityCoreFields,
} from '@/entity-configuration/definitions/fields-defs/enums';
import {
  EmptyPreview,
  EmptyValue,
  renderArray,
  renderContributorsModal,
  renderDate,
  renderEmptyOrValue,
  renderPreview,
} from '@/entity-configuration/definitions/renderer';
import { normalizeBrainRegionName } from '@/features/brain-region-hierarchy/helpers';
import { downloadPanelCircuitAtom } from '@/ui/segments/explore/circuit/elements/download-panel';
import { ensureArray } from '@/utils/array';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IContributor, TAgentType } from '@/api/entitycore/types/shared/global';
import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';

const collator = new Intl.Collator('en', { sensitivity: 'base' });

const renderContributors = (
  r: Record<string, unknown> & { contributions?: Array<IContributor> | null },
  filter: TAgentType
) => {
  if (!('contributions' in r) || !r.contributions) return EmptyValue;

  const sortedContribution = r.contributions
    .filter((c) => c.agent.type === AgentType.Consortium || c.agent.type === filter)
    .sort((a, b) => {
      if (
        a.agent.type === AgentType.Person &&
        b.agent.type === AgentType.Person &&
        a.agent.family_name &&
        b.agent.family_name
      )
        return collator.compare(a.agent.family_name, b.agent.family_name);
      return collator.compare(a.agent.pref_label, b.agent.pref_label);
    });
  if (!sortedContribution || sortedContribution.length === 0) return EmptyValue;
  return renderContributorsModal(sortedContribution, false, () => {}, 'inline');
};

export const FieldsDefinition: Partial<FieldsDefinitionRegistry<EntityCoreObjectTypes>> = {
  [EntityCoreFields.Preview]: {
    className: 'text-center',
    title: 'Preview',
    filter: null,
    render: (r) => {
      if (hasAssets(r)) {
        if (r.type === EntityTypeDict.IonChannelModel) {
          return renderPreview(
            r,
            { width: 184, height: 116 },
            'border border-neutral-3 h-full',
            undefined,
            undefined,
            undefined,
            undefined,
            'assetLabel',
            AssetLabel.ion_channel_model_thumbnail
          );
        }
        return renderPreview(r, { width: 184, height: 116 }, 'border border-neutral-3 h-full');
      }
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
    style: { width: 150 },
  },
  [EntityCoreFields.UpdateDate]: {
    title: 'Update date',
    filter: CoreFieldFilterTypeEnum.DateRange,
    render: (r) => renderDate(r.update_date),
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
    style: { width: 250 },
    render: (r) => (
      <div className="line-clamp-2 truncate overflow-hidden text-ellipsis whitespace-normal">
        {renderEmptyOrValue(r.description)}
      </div>
    ),
    renderForDetailView: (r) => renderEmptyOrValue(r.description),
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
    renderForDetailView: (r) =>
      renderContributors(
        r as Record<string, any> & { contributions?: Array<IContributor> | null },
        AgentType.Person
      ),
    vocabulary: {
      plural: 'Contributors',
      singular: 'Contributor',
    },
    defaultConstraint: 'contribution__pref_label__in',
    order: [
      {
        types: [
          ExtendedEntitiesTypeDict.Emodel,
          ExtendedEntitiesTypeDict.Circuit,
          ExtendedEntitiesTypeDict.SingleNeuronCircuit,
          ExtendedEntitiesTypeDict.PairedNeuronCircuit,
          ExtendedEntitiesTypeDict.SmallMicrocircuit,
          ExtendedEntitiesTypeDict.Microcircuit,
          ExtendedEntitiesTypeDict.MEModelWithSynapses,
          ExtendedEntitiesTypeDict.Simulation,
          ExtendedEntitiesTypeDict.SingleNeuronSimulation,
          ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
          ExtendedEntitiesTypeDict.SimulationCampaign,
          ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
          ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
          ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
          ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
          ExtendedEntitiesTypeDict.IonChannelModelSimulation,
        ],
        property: 'order_by',
        value: 'contribution__pref_label',
      },
    ],
    isSortable: true,
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
    renderForDetailView: (r) =>
      renderContributors(
        r as Record<string, any> & { contributions?: Array<IContributor> | null },
        AgentType.Organization
      ),
    vocabulary: {
      plural: 'Contributors',
      singular: 'Contributor',
    },
    defaultConstraint: 'contribution__pref_label__in',
    order: [
      {
        types: [
          ExtendedEntitiesTypeDict.Emodel,
          ExtendedEntitiesTypeDict.Circuit,
          ExtendedEntitiesTypeDict.SingleNeuronCircuit,
          ExtendedEntitiesTypeDict.PairedNeuronCircuit,
          ExtendedEntitiesTypeDict.SmallMicrocircuit,
          ExtendedEntitiesTypeDict.Microcircuit,
          ExtendedEntitiesTypeDict.MEModelWithSynapses,
          ExtendedEntitiesTypeDict.Simulation,
          ExtendedEntitiesTypeDict.SingleNeuronSimulation,
          ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
          ExtendedEntitiesTypeDict.SimulationCampaign,
          ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
          ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
          ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
          ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
          ExtendedEntitiesTypeDict.IonChannelModelSimulation,
        ],
        property: 'order_by',
        value: 'contribution__pref_label',
      },
    ],
    isSortable: true,
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.BrainRegion]: {
    title: 'Brain Region',
    filter: null,
    render: (r) =>
      renderEmptyOrValue('brain_region' in r ? normalizeBrainRegionName(r.brain_region.name) : ''),
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
          ExtendedEntitiesTypeDict.Circuit,
          ExtendedEntitiesTypeDict.ElectricalCellRecording,
          ExtendedEntitiesTypeDict.EMCellMesh,
          ExtendedEntitiesTypeDict.Emodel,
          ExtendedEntitiesTypeDict.ExperimentalBoutonDensity,
          ExtendedEntitiesTypeDict.ExperimentalNeuronDensity,
          ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection,
          ExtendedEntitiesTypeDict.IonChannelModel,
          ExtendedEntitiesTypeDict.IonChannelRecording,
          ExtendedEntitiesTypeDict.Memodel,
          ExtendedEntitiesTypeDict.MEModelWithSynapses,
          ExtendedEntitiesTypeDict.Microcircuit,
          ExtendedEntitiesTypeDict.PairedNeuronCircuit,
          ExtendedEntitiesTypeDict.SingleNeuronCircuit,
          ExtendedEntitiesTypeDict.SingleNeuronSimulation,
          ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
          ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
          ExtendedEntitiesTypeDict.SmallMicrocircuit,
        ],
        property: 'order_by',
        value: 'brain_region__name',
      },
    ],
  },
  [EntityCoreFields.SpeciesName]: {
    title: 'Species',
    filter: CoreFieldFilterTypeEnum.CheckList,
    presentation: {
      column: {
        available: {
          default: true,
          rules: [
            {
              when: {
                dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
                section: WorkspaceSection.Data,
              },
              value: false,
            },
          ],
        },
      },
      filter: {
        available: {
          default: true,
          rules: [
            {
              when: {
                dataType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
                section: WorkspaceSection.Data,
              },
              value: false,
            },
          ],
        },
        constraint: {
          default: 'species__name__in',
          rules: [
            {
              when: {
                dataType: [
                  ExtendedEntitiesTypeDict.CellMorphology,
                  ExtendedEntitiesTypeDict.ElectricalCellRecording,
                  ExtendedEntitiesTypeDict.ExperimentalNeuronDensity,
                  ExtendedEntitiesTypeDict.ExperimentalBoutonDensity,
                  ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection,
                  ExtendedEntitiesTypeDict.IonChannelModel,
                  ExtendedEntitiesTypeDict.IonChannelRecording,
                  ExtendedEntitiesTypeDict.Circuit,
                  ExtendedEntitiesTypeDict.MEModelWithSynapses,
                  ExtendedEntitiesTypeDict.UniversalCellMorphology,
                ],
              },
              value: 'subject__species__name__in',
            },
          ],
        },
      },
    },
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
      [ExtendedEntitiesTypeDict.CellMorphology]: 'subject__species__name__in',
      [ExtendedEntitiesTypeDict.ElectricalCellRecording]: 'subject__species__name__in',
      [ExtendedEntitiesTypeDict.ExperimentalNeuronDensity]: 'subject__species__name__in',
      [ExtendedEntitiesTypeDict.ExperimentalBoutonDensity]: 'subject__species__name__in',
      [ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection]: 'subject__species__name__in',
      [ExtendedEntitiesTypeDict.IonChannelModel]: 'subject__species__name__in',
      [ExtendedEntitiesTypeDict.IonChannelRecording]: 'subject__species__name__in',
      [ExtendedEntitiesTypeDict.Circuit]: 'subject__species__name__in',
      [ExtendedEntitiesTypeDict.MEModelWithSynapses]: 'subject__species__name__in',
      [ExtendedEntitiesTypeDict.UniversalCellMorphology]: 'subject__species__name__in',
    },
    order: [
      {
        types: [
          ExtendedEntitiesTypeDict.CellMorphology,
          ExtendedEntitiesTypeDict.Circuit,
          ExtendedEntitiesTypeDict.ElectricalCellRecording,
          ExtendedEntitiesTypeDict.ExperimentalBoutonDensity,
          ExtendedEntitiesTypeDict.ExperimentalNeuronDensity,
          ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection,
          ExtendedEntitiesTypeDict.IonChannelModel,
          ExtendedEntitiesTypeDict.IonChannelRecording,
          ExtendedEntitiesTypeDict.MEModelWithSynapses,
          ExtendedEntitiesTypeDict.UniversalCellMorphology,
        ],
        property: 'order_by',
        value: 'subject__species__name',
      },
    ],
    isSortable: true,
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.StrainName]: {
    title: 'Strain',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => {
      if ('strain' in r)
        return renderEmptyOrValue(renderArray(ensureArray({ input: r.strain }).map((s) => s.name)));
      if ('subject' in r && 'strain' in r.subject)
        return renderEmptyOrValue(r.subject.strain?.name);
      return EmptyValue;
    },
    vocabulary: {
      plural: 'Strains',
      singular: 'Strain',
    },
    isSortable: false,
    isFilterable: false,
    isDisplayable: false,
  },
  [EntityCoreFields.SubjectAge]: {
    title: 'Age',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    render: (r) => {
      const ageValue = get(r, 'subject.age_value');
      if (isNil(ageValue)) return EmptyValue;
      const days = Math.floor(ageValue / 86400); //seconds to days
      return renderEmptyOrValue(`${days} days`);
    },
    vocabulary: {
      plural: 'Ages',
      singular: 'Age',
    },
    isFilterable: false,
    isDisplayable: true,
    isSortable: true,
    order: [
      {
        types: [
          ExtendedEntitiesTypeDict.ExperimentalBoutonDensity,
          ExtendedEntitiesTypeDict.ExperimentalNeuronDensity,
        ],
        property: 'order_by',
        value: 'subject__age_value',
      },
    ],
  },
  [EntityCoreFields.SubjectSex]: {
    title: 'Sex',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    render: (r) => renderEmptyOrValue(get(r, 'subject.sex')),
    vocabulary: {
      plural: 'Sex',
      singular: 'Sex',
    },
    isFilterable: false,
    isDisplayable: false,
    isSortable: false,
  },
  [EntityCoreFields.SubjectWeight]: {
    title: 'Weight',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    unit: 'gramms',
    render: (r) => renderEmptyOrValue(get(r, 'subject.weight', null)),
    vocabulary: {
      plural: 'Values',
      singular: 'Value',
    },
    isSortable: false,
    isFilterable: false,
    isDisplayable: false,
  },
  [EntityCoreFields.SubjectStrainName]: {
    title: 'Strain',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => renderEmptyOrValue(get(r, 'subject.strain.name', null)),
    vocabulary: {
      plural: 'Strains',
      singular: 'Strain',
    },
    isSortable: false,
    isFilterable: false,
    isDisplayable: false,
  },
  [EntityCoreFields.SubjectSpeciesName]: {
    title: 'Species',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => renderEmptyOrValue(get(r, 'subject.species.name')),
    vocabulary: {
      plural: 'Species',
      singular: 'Species',
    },
    isFilterable: false,
    isDisplayable: false,
    isSortable: false,
  },
  [EntityCoreFields.SubjectAgeMax]: {
    title: 'Age max',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    render: (r) => renderEmptyOrValue(get(r, 'subject.age_max')),
    vocabulary: {
      plural: 'Age max',
      singular: 'Age max',
    },
    isFilterable: false,
    isDisplayable: false,
    isSortable: false,
  },
  [EntityCoreFields.SubjectAgeMin]: {
    title: 'Age min',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    render: (r) => renderEmptyOrValue(get(r, 'subject.age_min')),
    vocabulary: {
      plural: 'Age min',
      singular: 'Age min',
    },
    isFilterable: false,
    isDisplayable: false,
    isSortable: false,
  },

  [EntityCoreFields.SubjectAgePeriod]: {
    title: 'Age period',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    render: (r) => renderEmptyOrValue(get(r, 'subject.age_period')),
    vocabulary: {
      plural: 'Age period',
      singular: 'Age period',
    },
    isFilterable: false,
    isDisplayable: false,
    isSortable: false,
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
          ExtendedEntitiesTypeDict.Circuit,
          ExtendedEntitiesTypeDict.SingleNeuronCircuit,
          ExtendedEntitiesTypeDict.PairedNeuronCircuit,
          ExtendedEntitiesTypeDict.SmallMicrocircuit,
          ExtendedEntitiesTypeDict.Microcircuit,
          ExtendedEntitiesTypeDict.EMCellMesh,
          ExtendedEntitiesTypeDict.Emodel,
          ExtendedEntitiesTypeDict.IonChannelModel,
          ExtendedEntitiesTypeDict.Simulation,
          ExtendedEntitiesTypeDict.SimulationCampaign,
          ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
          ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
          ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
          ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
          ExtendedEntitiesTypeDict.IonChannelModelSimulation,
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
      value: 'ion_channel__name',
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
        if (type !== EntityTypeDict.Circuit) return;

        e.stopPropagation();
        e.preventDefault();

        setDownloadPanelCircuit(entity as ICircuit);
      }}
    >
      <DownloadIcon className="text-current" />
    </Button>
  );
}
