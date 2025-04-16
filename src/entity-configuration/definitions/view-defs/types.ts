import { EntityCoreFields } from '@/entity-configuration/definitions/fields/enums';

export type DetailProps = { field: EntityCoreFields; className?: string };

export enum DataTypeGroup {
  ExperimentalData = 'experimental',
  ModelData = 'models',
  SimulationData = 'simulations',
}

export type ViewDefinitionConfig = {
  title: string;
  name: string;
  columns: Array<EntityCoreFields>;
  curated: boolean;
  group: DataTypeGroup;
  cardViewFields?: DetailProps[];
  mlTopic?: string;
};
