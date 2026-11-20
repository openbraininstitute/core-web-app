import type { AssetStatus } from '@/api/entitycore/types/shared/global';

/** A research log: an EntityCore record that owns the list, name, description and access. */
export interface IResearchLog {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly authorized_public: boolean;
  readonly authorized_project_id: string;
  readonly creation_date: string;
  readonly update_date: string;
  // id: the creator's EntityCore person id. sub_id (their Keycloak sub, the logbook server's
  // userId) is in the full person record, not in the list's nested one: there, `id` stands in.
  readonly created_by: {
    readonly pref_label: string;
    readonly id?: string;
    readonly sub_id?: string | null;
  };
  readonly assets?: readonly IResearchLogAsset[];
}

/** One asset of a research log: its files folder, or a page's synced document. */
export interface IResearchLogAsset {
  readonly id: string;
  readonly path: string;
  readonly label?: string;
  readonly size: number;
  readonly status?: AssetStatus;
  readonly is_directory: boolean;
  readonly meta?: Readonly<Record<string, unknown>> | null;
}

export interface IResearchLogDraft {
  readonly name: string;
  readonly description: string;
}
