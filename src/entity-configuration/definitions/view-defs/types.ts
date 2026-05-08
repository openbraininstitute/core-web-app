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
  columns: Array<EntityCoreFields>;
  curated?: boolean;
  group?: DataTypeGroup;
  cardViewFields?: Array<TypeSummaryProps>;
  summaryViewFields?: Array<TypeSummaryProps>;
  miniDetailView?: Array<TypeSummaryProps>;
  /**
   * @deprecated this was never used
   * `presentation.filter.available` and keep this property only as a legacy fallback.
   */
  filterableFields?: Array<EntityCoreFields>;
  /**
   * @deprecated this was never used
   * `presentation.column.available` and keep this property only as a legacy fallback.
   */
  displayableFields?: Array<EntityCoreFields>;
  mlTopic?: string;
};
