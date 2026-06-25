import { kebabCase } from 'es-toolkit/compat';
import { isValidElement, type ReactNode } from 'react';

import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import {
  type TWorkspaceScope,
  type TWorkspaceSection,
  WorkspaceScope,
  WorkspaceSection,
} from '@/constants';
import { getFieldDefinition } from '@/entity-configuration/definitions';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  makeTypeDefaultActiveColumns,
  makeTypeDefaultFilters,
} from '@/ui/segments/data-table/elements/helpers';
import {
  ExperimentalEntitiesTileTypes,
  ModelEntitiesTileTypes,
  SimulationEntitiesTileTypes,
} from '@/ui/segments/explore/helpers';
import { fieldTitleSentenceCase } from '@/util/utils';

type DataEntityConfig = {
  extendedType: TExtendedEntitiesTypeDict;
  title: string;
};

export type DataBrowserGroup = 'Experimental' | 'Model' | 'Simulations';

export type DataBrowserEntity = {
  group: DataBrowserGroup;
  type: TExtendedEntitiesTypeDict;
  title: string;
  routeSegment: string;
};

type ListingContext = {
  dataType: TExtendedEntitiesTypeDict;
  section?: TWorkspaceSection;
  scope?: TWorkspaceScope;
};

const FIELD_UNIT_TEXT_OVERRIDES: Partial<Record<EntityCoreFields, string>> = {
  [EntityCoreFields.MeanSTD]: 'µm-1',
};

function normalizeLabel(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function reactNodeText(value: ReactNode): string {
  if (value === null || value === undefined || typeof value === 'boolean') return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(reactNodeText).join('');
  if (isValidElement<{ children?: ReactNode }>(value)) return reactNodeText(value.props.children);
  return '';
}

function toDataEntity(group: DataBrowserGroup, config: DataEntityConfig): DataBrowserEntity {
  return {
    group,
    type: config.extendedType,
    title: config.title,
    routeSegment: kebabCase(config.extendedType),
  };
}

function fieldColumnHeader(field: EntityCoreFields, dataType: TExtendedEntitiesTypeDict): string {
  const definition = getFieldDefinition(field);
  const label = fieldTitleSentenceCase(definition?.title ?? '');
  if (!label) return '';

  if (definition?.unit && dataType !== ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection) {
    const unit = FIELD_UNIT_TEXT_OVERRIDES[field] ?? reactNodeText(definition.unit);
    return normalizeLabel(`${label}[${unit}]`);
  }

  return normalizeLabel(label);
}

function fieldFilterLabel(field: EntityCoreFields): string {
  return normalizeLabel(fieldTitleSentenceCase(getFieldDefinition(field)?.title ?? ''));
}

export const DATA_BROWSER_ENTITIES: DataBrowserEntity[] = [
  ...Object.values(ExperimentalEntitiesTileTypes).map((config) =>
    toDataEntity('Experimental', config)
  ),
  ...Object.values(ModelEntitiesTileTypes).map((config) => toDataEntity('Model', config)),
  ...Object.values(SimulationEntitiesTileTypes).map((config) =>
    toDataEntity('Simulations', config)
  ),
];

export function getDataBrowserEntity(type: TExtendedEntitiesTypeDict): DataBrowserEntity {
  const entity = DATA_BROWSER_ENTITIES.find((item) => item.type === type);
  if (!entity) {
    throw new Error(`Missing E2E data browser entity manifest for ${type}.`);
  }
  return entity;
}

export function getExpectedColumnHeaders({
  dataType,
  section = WorkspaceSection.Data,
  scope = WorkspaceScope.Public,
}: ListingContext): string[] {
  return makeTypeDefaultActiveColumns({ dataType, section, scope })
    .map((field) => fieldColumnHeader(field, dataType))
    .filter(Boolean);
}

export function getExpectedFilterLabels({
  dataType,
  section = WorkspaceSection.Data,
  scope = WorkspaceScope.Public,
}: ListingContext): string[] {
  return makeTypeDefaultFilters({ dataType, section, scope })
    .filter((filter) => filter.field !== EntityCoreFields.ID)
    .map((filter) => fieldFilterLabel(filter.field))
    .filter(Boolean);
}

export const WORKFLOW_ACTIVITY_COLUMN_HEADERS = ['Name', 'Category', 'Type', 'Date', 'Status'];
