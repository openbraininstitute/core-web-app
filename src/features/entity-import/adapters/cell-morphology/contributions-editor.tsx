'use client';

import clsx from 'clsx';
import { useMemo, useState } from 'react';

import { Button } from '@/ui/molecules/button';
import { Input } from '@/ui/molecules/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import { AgentType, type TAgentType } from '@/ui/segments/contribute/shared/types';

import type { EntityImportActions, EntityImportRuntimeContext } from '../../core/adapter';
import type { ImportCellState, ImportRowState, Suggestion } from '../../core/contracts';
import type { CellMorphologyContributionInput, CellMorphologyImportServices } from './services';

export interface ContributionDraft extends Partial<CellMorphologyContributionInput> {
  id: string;
  agent_label?: string;
  role_label?: string;
}

const CONTRIBUTOR_TYPES = Object.values(AgentType);

function createContributionId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `contribution-${Math.random().toString(36).slice(2)}`;
}

function createBlankContribution(): ContributionDraft {
  return {
    id: createContributionId(),
    agent_type: undefined,
    agent_id: '',
    role_id: '',
    agent_label: '',
    role_label: '',
  };
}

function summarizeContributions(entries: Array<ContributionDraft>): string {
  const completedEntries = entries.filter(
    (entry) => entry.agent_type && entry.agent_id && entry.role_id
  );

  if (completedEntries.length === 0) {
    return '';
  }

  return `${completedEntries.length} contributor${completedEntries.length === 1 ? '' : 's'}`;
}

interface ContributionsEditorProps {
  cell: ImportCellState;
  row: ImportRowState;
  fieldPath: string;
  context: EntityImportRuntimeContext;
  actions: EntityImportActions;
  services: Pick<
    CellMorphologyImportServices,
    'searchPersons' | 'searchOrganizations' | 'searchConsortia' | 'searchRoles'
  >;
}

export function ContributionsEditor({
  cell,
  row,
  fieldPath,
  context,
  actions,
  services,
}: ContributionsEditorProps) {
  const storedEntries = useMemo(
    () =>
      (cell.parsedValue as Array<ContributionDraft> | undefined)?.length
        ? (cell.parsedValue as Array<ContributionDraft>).map((entry) => ({
            ...entry,
            id: entry.id ?? createContributionId(),
          }))
        : [createBlankContribution()],
    [cell.parsedValue]
  );
  const [agentQueries, setAgentQueries] = useState<Record<number, string>>({});
  const [roleQueries, setRoleQueries] = useState<Record<number, string>>({});
  const [agentSuggestions, setAgentSuggestions] = useState<Record<number, Array<Suggestion>>>({});
  const [roleSuggestions, setRoleSuggestions] = useState<Record<number, Array<Suggestion>>>({});

  const syncEntries = (nextEntries: Array<ContributionDraft>) => {
    const normalizedEntries = nextEntries.filter(
      (entry) =>
        entry.agent_type || entry.agent_id || entry.role_id || entry.agent_label || entry.role_label
    );

    actions.setCustomValue({
      rowId: row.id,
      fieldPath,
      rawValue: summarizeContributions(normalizedEntries),
      parsedValue: normalizedEntries,
    });
  };

  const searchAgents = async (index: number, query: string, entry: ContributionDraft) => {
    setAgentQueries((current) => ({ ...current, [index]: query }));
    if (query.trim().length < 2) {
      setAgentSuggestions((current) => ({ ...current, [index]: [] }));
      return;
    }

    if (!entry.agent_type) {
      setAgentSuggestions((current) => ({ ...current, [index]: [] }));
      return;
    }

    const lookup =
      entry.agent_type === 'organization'
        ? services.searchOrganizations
        : entry.agent_type === 'consortium'
          ? services.searchConsortia
          : services.searchPersons;

    const suggestions = await lookup(query, context);
    setAgentSuggestions((current) => ({ ...current, [index]: suggestions }));
  };

  const searchRoles = async (index: number, query: string) => {
    setRoleQueries((current) => ({ ...current, [index]: query }));
    if (query.trim().length < 2) {
      setRoleSuggestions((current) => ({ ...current, [index]: [] }));
      return;
    }

    const suggestions = await services.searchRoles(query, context);
    setRoleSuggestions((current) => ({ ...current, [index]: suggestions }));
  };

  return (
    <div className="space-y-4">
      {storedEntries.map((entry, index) => {
        const agentQuery = agentQueries[index] ?? entry.agent_label ?? '';
        const roleQuery = roleQueries[index] ?? entry.role_label ?? '';
        const contributorTypeId = `contribution-type-${row.id}-${entry.id}`;
        const contributorInputId = `contribution-agent-${row.id}-${entry.id}`;
        const roleInputId = `contribution-role-${row.id}-${entry.id}`;

        return (
          <div key={entry.id} className="rounded-2xl border border-neutral-200 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="block">
                <label
                  className="mb-2 block text-sm font-medium text-neutral-700"
                  htmlFor={contributorTypeId}
                >
                  Contributor type
                </label>
                <Select
                  value={entry.agent_type ?? undefined}
                  onValueChange={(value) => {
                    const nextEntries = storedEntries.map((storedEntry, storedIndex) =>
                      storedIndex === index
                        ? {
                            ...storedEntry,
                            agent_type: value as TAgentType,
                            agent_id: '',
                            agent_label: '',
                          }
                        : storedEntry
                    );
                    syncEntries(nextEntries);
                  }}
                >
                  <SelectTrigger id={contributorTypeId} className="w-full rounded-xl">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRIBUTOR_TYPES.map((typeOption) => (
                      <SelectItem key={typeOption.key} value={typeOption.key}>
                        {typeOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="block">
                <label
                  className="mb-2 block text-sm font-medium text-neutral-700"
                  htmlFor={contributorInputId}
                >
                  Contributor
                </label>
                <Input
                  id={contributorInputId}
                  className="h-11"
                  placeholder="Search contributor"
                  value={agentQuery}
                  onChange={(event) => void searchAgents(index, event.target.value, entry)}
                />
              </div>
            </div>

            {agentSuggestions[index]?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {agentSuggestions[index].map((suggestion) => (
                  <Button
                    rounded
                    key={suggestion.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const nextEntries = storedEntries.map((storedEntry, storedIndex) =>
                        storedIndex === index
                          ? {
                              ...storedEntry,
                              agent_id: suggestion.value,
                              agent_label: suggestion.label,
                            }
                          : storedEntry
                      );
                      setAgentQueries((current) => ({ ...current, [index]: suggestion.label }));
                      setAgentSuggestions((current) => ({ ...current, [index]: [] }));
                      syncEntries(nextEntries);
                    }}
                  >
                    {suggestion.label}
                  </Button>
                ))}
              </div>
            ) : null}

            <div className="mt-3">
              <div className="block">
                <label
                  className="mb-2 block text-sm font-medium text-neutral-700"
                  htmlFor={roleInputId}
                >
                  Role
                </label>
                <Input
                  id={roleInputId}
                  className="h-11"
                  placeholder="Search role"
                  value={roleQuery}
                  onChange={(event) => void searchRoles(index, event.target.value)}
                />
              </div>
              {roleSuggestions[index]?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {roleSuggestions[index].map((suggestion) => (
                    <Button
                      rounded
                      key={suggestion.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const nextEntries = storedEntries.map((storedEntry, storedIndex) =>
                          storedIndex === index
                            ? {
                                ...storedEntry,
                                role_id: suggestion.value,
                                role_label: suggestion.label,
                              }
                            : storedEntry
                        );
                        setRoleQueries((current) => ({ ...current, [index]: suggestion.label }));
                        setRoleSuggestions((current) => ({ ...current, [index]: [] }));
                        syncEntries(nextEntries);
                      }}
                    >
                      {suggestion.label}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                rounded
                type="button"
                variant="outline"
                size="sm"
                className={clsx(
                  storedEntries.length === 1
                    ? 'cursor-not-allowed text-neutral-400'
                    : 'text-neutral-700'
                )}
                disabled={storedEntries.length === 1}
                onClick={() => {
                  const nextEntries = storedEntries.filter(
                    (_, storedIndex) => storedIndex !== index
                  );
                  syncEntries(nextEntries.length > 0 ? nextEntries : [createBlankContribution()]);
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        );
      })}

      <Button
        rounded
        type="button"
        variant="outline"
        size="md"
        onClick={() => syncEntries([...storedEntries, createBlankContribution()])}
      >
        Add contribution
      </Button>
    </div>
  );
}
