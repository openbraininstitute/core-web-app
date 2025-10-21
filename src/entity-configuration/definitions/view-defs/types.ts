import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

export type TypeSummaryProps = { field: EntityCoreFields; className?: string };

export enum DataTypeGroup {
  ExperimentalData = 'experimental',
  ModelData = 'models',
  SimulationData = 'simulations',
}

export type ViewDefinitionConfig = {
  title: string;
  name: string;
  columns: Array<EntityCoreFields>;
  curated?: boolean;
  group?: DataTypeGroup;
  cardViewFields?: Array<TypeSummaryProps>;
  summaryViewFields?: Array<TypeSummaryProps>;
  miniDetailView?: Array<TypeSummaryProps>;
  filterableFields?: Array<EntityCoreFields>;
  displayableFields?: Array<EntityCoreFields>;
  mlTopic?: string;
};
