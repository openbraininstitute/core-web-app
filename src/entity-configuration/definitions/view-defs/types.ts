import type { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

export type TypeSummaryProps = { field: EntityCoreFields; className?: string };

export enum DataTypeGroup {
  ExperimentalData = 'experimental',
  ModelData = 'models',
  SimulationData = 'simulations',
}

export type ViewDefinitionConfig = {
  title: string;
  name: string;
  columns: EntityCoreFields[];
  curated?: boolean;
  group?: DataTypeGroup;
  cardViewFields?: TypeSummaryProps[];
  summaryViewFields?: TypeSummaryProps[];
  miniDetailView?: TypeSummaryProps[];
  filterableFields?: EntityCoreFields[];
  displayableFields?: EntityCoreFields[];
  mlTopic?: string;
};
