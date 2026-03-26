'use client';

import { AgentType, type TAgentType } from '@/ui/segments/contribute/shared/types';

import { type LocationValue, parseLocationSummary, summarizeLocation } from './location-editor';

import type { EntityImportRuntimeContext } from '@/features/entity-import/core/adapter';
import type { ISuggestion } from '@/features/entity-import/core/contracts';
import type { ICellMorphologyImportServices } from './services';

type ContributionServices = Pick<
  ICellMorphologyImportServices,
  'queryPerson' | 'queryOrganization' | 'queryConsortium' | 'queryRole'
>;

type ExactLookupResult =
  | { status: 'none' }
  | { status: 'ambiguous' }
  | { status: 'unique'; suggestion: ISuggestion };

type ExactLookupCache = Map<string, Promise<ExactLookupResult>>;

export interface ParsedContributionCsvEntry {
  id: string;
  source_tuple: string;
  agent_type?: TAgentType;
  agent_id: string;
  role_id: string;
  agent_label: string;
  role_label: string;
  imported_agent_text?: string;
  imported_role_text?: string;
  imported_type_text?: string;
  issues: Array<string>;
}

export interface ParsedContributionCsvValue {
  entries: Array<ParsedContributionCsvEntry>;
  issues: Array<string>;
}

export interface ParsedLocationCsvValue {
  rawValue: string;
  parsedValue: LocationValue | null;
  issues: Array<string>;
}

const LOCATION_TUPLE_ERROR = 'Location must be provided as a tuple in the form `(x, y, z)`.';
const CONTRIBUTION_TUPLE_ERROR =
  'Contributions must be provided as tuples in the form `[(type, name, role), ...]`.';
const EXACT_QUERY_PAGE_SIZE = 100;

const CONTRIBUTOR_QUERY_FIELDS = {
  [AgentType.Person.key]: 'pref_label__ilike',
  [AgentType.Organization.key]: 'pref_label__ilike',
  [AgentType.Consortium.key]: 'pref_label__ilike',
} as const;

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function createEntry(index: number, tupleText: string): ParsedContributionCsvEntry {
  return {
    id: `csv-contribution-${index + 1}`,
    source_tuple: tupleText,
    agent_id: '',
    role_id: '',
    agent_label: '',
    role_label: '',
    issues: [],
  };
}

function splitTupleTokens(tupleText: string): Array<string> {
  return tupleText.split(',').map((token) => token.trim());
}

function parseTupleList(rawValue: string): { tuples: Array<string>; issues: Array<string> } {
  const normalized = rawValue.trim();
  if (!normalized) {
    return { tuples: [], issues: [] };
  }

  const listSource =
    normalized.startsWith('[') && normalized.endsWith(']') ? normalized : `[${normalized}]`;
  if (!listSource.startsWith('[') || !listSource.endsWith(']')) {
    return { tuples: [], issues: [CONTRIBUTION_TUPLE_ERROR] };
  }

  const body = listSource.slice(1, -1).trim();
  if (!body) {
    return { tuples: [], issues: [] };
  }

  const tuples: Array<string> = [];
  let depth = 0;
  let current = '';
  let expectsSeparator = false;

  for (const character of body) {
    if (character === '(') {
      if (depth === 0) {
        if (expectsSeparator) {
          return { tuples: [], issues: [CONTRIBUTION_TUPLE_ERROR] };
        }
        current = '';
      } else {
        current += character;
      }

      depth += 1;
      continue;
    }

    if (character === ')') {
      if (depth === 0) {
        return { tuples: [], issues: [CONTRIBUTION_TUPLE_ERROR] };
      }

      depth -= 1;
      if (depth === 0) {
        tuples.push(current.trim());
        current = '';
        expectsSeparator = true;
      } else {
        current += character;
      }
      continue;
    }

    if (depth > 0) {
      current += character;
      continue;
    }

    if (/\s/.test(character)) {
      continue;
    }

    if (character === ',') {
      if (!expectsSeparator) {
        return { tuples: [], issues: [CONTRIBUTION_TUPLE_ERROR] };
      }
      expectsSeparator = false;
      continue;
    }

    return { tuples: [], issues: [CONTRIBUTION_TUPLE_ERROR] };
  }

  if (depth !== 0 || !expectsSeparator) {
    return { tuples: [], issues: [CONTRIBUTION_TUPLE_ERROR] };
  }

  return { tuples, issues: [] };
}

function resolveAgentTypeToken(token: string): TAgentType | null {
  const normalizedToken = normalizeToken(token);
  if (!normalizedToken) {
    return null;
  }

  const match = Object.values(AgentType).find(
    (candidate) =>
      normalizeToken(candidate.key) === normalizedToken ||
      normalizeToken(candidate.label) === normalizedToken
  );

  return match?.key ?? null;
}

function toExactLookupResult(suggestions: Array<ISuggestion>, query: string): ExactLookupResult {
  const normalizedQuery = normalizeToken(query);
  const matches = suggestions.filter(
    (suggestion) =>
      normalizeToken(suggestion.label) === normalizedQuery ||
      normalizeToken(suggestion.value) === normalizedQuery
  );

  if (matches.length === 1) {
    return {
      status: 'unique',
      suggestion: matches[0],
    };
  }

  if (matches.length > 1) {
    return { status: 'ambiguous' };
  }

  return { status: 'none' };
}

function setContributorMatch(
  entry: ParsedContributionCsvEntry,
  params: {
    agentType: TAgentType;
    suggestion: ISuggestion;
  }
) {
  entry.agent_type = params.agentType;
  entry.agent_id = params.suggestion.value;
  entry.agent_label = params.suggestion.label;
  entry.imported_agent_text = undefined;
}

function setRoleMatch(entry: ParsedContributionCsvEntry, suggestion: ISuggestion) {
  entry.role_id = suggestion.value;
  entry.role_label = suggestion.label;
  entry.imported_role_text = undefined;
}

function addMissingFieldIssues(entry: ParsedContributionCsvEntry, contributionNumber: number) {
  if (!entry.agent_id && !entry.issues.some((issue) => issue.includes('Contributor'))) {
    entry.issues.push(`Contributor is required for contribution ${contributionNumber}.`);
  }

  if (!entry.role_id && !entry.issues.some((issue) => issue.includes('Role'))) {
    entry.issues.push(`Role is required for contribution ${contributionNumber}.`);
  }
}

async function queryExactMatch({
  cache,
  cacheKey,
  query,
  querySuggestions,
  queryField,
  context,
}: {
  cache: ExactLookupCache;
  cacheKey: string;
  query: string;
  querySuggestions: ContributionServices[keyof ContributionServices];
  queryField: 'pref_label__ilike' | 'name__ilike';
  context: EntityImportRuntimeContext;
}): Promise<ExactLookupResult> {
  const normalizedQuery = normalizeToken(query);
  if (!normalizedQuery) {
    return { status: 'none' };
  }

  const cachedLookup = cache.get(cacheKey);
  if (cachedLookup) {
    return await cachedLookup;
  }

  const lookupPromise = querySuggestions({
    query,
    queryField,
    context,
    pageParam: 0,
    pageSize: EXACT_QUERY_PAGE_SIZE,
  } as never).then((response) => toExactLookupResult(response.suggestions, query));

  cache.set(cacheKey, lookupPromise);
  return await lookupPromise;
}

async function resolveContributorTokenAcrossAllTypes({
  token,
  services,
  context,
  cache,
}: {
  token: string;
  services: ContributionServices;
  context: EntityImportRuntimeContext;
  cache: ExactLookupCache;
}) {
  const matches = await Promise.all(
    (
      [
        [AgentType.Person.key, services.queryPerson],
        [AgentType.Organization.key, services.queryOrganization],
        [AgentType.Consortium.key, services.queryConsortium],
      ] as const
    ).map(async ([agentType, querySuggestions]) => ({
      agentType,
      result: await queryExactMatch({
        cache,
        cacheKey: `${agentType}:${normalizeToken(token)}`,
        query: token,
        querySuggestions,
        queryField: CONTRIBUTOR_QUERY_FIELDS[agentType],
        context,
      }),
    }))
  );

  const uniqueMatches = matches.filter(
    (
      match
    ): match is { agentType: TAgentType; result: { status: 'unique'; suggestion: ISuggestion } } =>
      match.result.status === 'unique'
  );
  const hasAmbiguousMatch = matches.some((match) => match.result.status === 'ambiguous');

  if (uniqueMatches.length === 1 && !hasAmbiguousMatch) {
    return {
      status: 'unique' as const,
      agentType: uniqueMatches[0].agentType,
      suggestion: uniqueMatches[0].result.suggestion,
    };
  }

  if (uniqueMatches.length > 1 || hasAmbiguousMatch) {
    return { status: 'ambiguous' as const };
  }

  return { status: 'none' as const };
}

async function resolveRoleToken({
  token,
  services,
  context,
  cache,
}: {
  token: string;
  services: ContributionServices;
  context: EntityImportRuntimeContext;
  cache: ExactLookupCache;
}) {
  return queryExactMatch({
    cache,
    cacheKey: `role:${normalizeToken(token)}`,
    query: token,
    querySuggestions: services.queryRole,
    queryField: 'name__ilike',
    context,
  });
}

async function resolveContributorTokenByType({
  token,
  agentType,
  services,
  context,
  cache,
}: {
  token: string;
  agentType: TAgentType;
  services: ContributionServices;
  context: EntityImportRuntimeContext;
  cache: ExactLookupCache;
}) {
  const querySuggestions =
    agentType === AgentType.Organization.key
      ? services.queryOrganization
      : agentType === AgentType.Consortium.key
        ? services.queryConsortium
        : services.queryPerson;

  return queryExactMatch({
    cache,
    cacheKey: `${agentType}:${normalizeToken(token)}`,
    query: token,
    querySuggestions,
    queryField: CONTRIBUTOR_QUERY_FIELDS[agentType],
    context,
  });
}

async function hydrateThreeSlotContribution({
  entry,
  tupleText,
  contributionNumber,
  services,
  context,
  cache,
}: {
  entry: ParsedContributionCsvEntry;
  tupleText: string;
  contributionNumber: number;
  services: ContributionServices;
  context: EntityImportRuntimeContext;
  cache: ExactLookupCache;
}) {
  const [typeToken = '', agentToken = '', roleToken = ''] = splitTupleTokens(tupleText);
  entry.imported_type_text = typeToken || undefined;
  entry.imported_agent_text = agentToken || undefined;
  entry.imported_role_text = roleToken || undefined;

  const resolvedType = resolveAgentTypeToken(typeToken);
  if (typeToken && !resolvedType) {
    entry.issues.push(
      `Contribution ${contributionNumber}: \`${typeToken}\` is not a supported contributor type.`
    );
  }

  if (resolvedType) {
    entry.agent_type = resolvedType;
    entry.imported_type_text = undefined;
  }

  if (agentToken) {
    if (entry.agent_type) {
      const contributorLookup = await resolveContributorTokenByType({
        token: agentToken,
        agentType: entry.agent_type,
        services,
        context,
        cache,
      });

      if (contributorLookup.status === 'unique') {
        setContributorMatch(entry, {
          agentType: entry.agent_type,
          suggestion: contributorLookup.suggestion,
        });
      } else if (contributorLookup.status === 'ambiguous') {
        entry.issues.push(
          `Contribution ${contributionNumber}: contributor \`${agentToken}\` matches multiple ${entry.agent_type} records.`
        );
      } else {
        entry.issues.push(
          `Contribution ${contributionNumber}: contributor \`${agentToken}\` could not be resolved.`
        );
      }
    } else {
      const contributorLookup = await resolveContributorTokenAcrossAllTypes({
        token: agentToken,
        services,
        context,
        cache,
      });

      if (contributorLookup.status === 'unique') {
        setContributorMatch(entry, contributorLookup);
        entry.imported_type_text = undefined;
      } else if (contributorLookup.status === 'ambiguous') {
        entry.issues.push(
          `Contribution ${contributionNumber}: contributor \`${agentToken}\` matches multiple contributor records.`
        );
      } else {
        entry.issues.push(
          `Contribution ${contributionNumber}: contributor \`${agentToken}\` could not be resolved.`
        );
      }
    }
  }

  if (roleToken) {
    const roleLookup = await resolveRoleToken({
      token: roleToken,
      services,
      context,
      cache,
    });

    if (roleLookup.status === 'unique') {
      setRoleMatch(entry, roleLookup.suggestion);
    } else if (roleLookup.status === 'ambiguous') {
      entry.issues.push(
        `Contribution ${contributionNumber}: role \`${roleToken}\` matches multiple roles.`
      );
    } else {
      entry.issues.push(
        `Contribution ${contributionNumber}: role \`${roleToken}\` could not be resolved.`
      );
    }
  }

  addMissingFieldIssues(entry, contributionNumber);
}

async function hydrateSingleTokenContribution({
  entry,
  token,
  contributionNumber,
  services,
  context,
  cache,
}: {
  entry: ParsedContributionCsvEntry;
  token: string;
  contributionNumber: number;
  services: ContributionServices;
  context: EntityImportRuntimeContext;
  cache: ExactLookupCache;
}) {
  const resolvedType = resolveAgentTypeToken(token);
  if (resolvedType) {
    entry.agent_type = resolvedType;
    addMissingFieldIssues(entry, contributionNumber);
    return;
  }

  const [contributorLookup, roleLookup] = await Promise.all([
    resolveContributorTokenAcrossAllTypes({
      token,
      services,
      context,
      cache,
    }),
    resolveRoleToken({
      token,
      services,
      context,
      cache,
    }),
  ]);

  if (contributorLookup.status === 'unique' && roleLookup.status === 'none') {
    setContributorMatch(entry, contributorLookup);
    entry.imported_agent_text = undefined;
    addMissingFieldIssues(entry, contributionNumber);
    return;
  }

  if (roleLookup.status === 'unique' && contributorLookup.status === 'none') {
    setRoleMatch(entry, roleLookup.suggestion);
    entry.imported_role_text = undefined;
    addMissingFieldIssues(entry, contributionNumber);
    return;
  }

  if (contributorLookup.status !== 'none' && roleLookup.status !== 'none') {
    entry.imported_agent_text = token;
    entry.imported_role_text = token;
    entry.issues.push(
      `Contribution ${contributionNumber}: token \`${token}\` is ambiguous between contributor and role.`
    );
    return;
  }

  entry.imported_agent_text = token;
  entry.issues.push(
    `Contribution ${contributionNumber}: token \`${token}\` could not be resolved.`
  );
  addMissingFieldIssues(entry, contributionNumber);
}

async function hydrateTwoTokenContribution({
  entry,
  tokens,
  contributionNumber,
  services,
  context,
  cache,
}: {
  entry: ParsedContributionCsvEntry;
  tokens: Array<string>;
  contributionNumber: number;
  services: ContributionServices;
  context: EntityImportRuntimeContext;
  cache: ExactLookupCache;
}) {
  const [firstToken = '', secondToken = ''] = tokens;
  const resolvedType = resolveAgentTypeToken(firstToken);

  if (resolvedType) {
    entry.agent_type = resolvedType;

    const [contributorLookup, roleLookup] = await Promise.all([
      secondToken
        ? resolveContributorTokenByType({
            token: secondToken,
            agentType: resolvedType,
            services,
            context,
            cache,
          })
        : Promise.resolve<ExactLookupResult>({ status: 'none' }),
      secondToken
        ? resolveRoleToken({
            token: secondToken,
            services,
            context,
            cache,
          })
        : Promise.resolve<ExactLookupResult>({ status: 'none' }),
    ]);

    if (contributorLookup.status === 'unique' && roleLookup.status === 'none') {
      setContributorMatch(entry, {
        agentType: resolvedType,
        suggestion: contributorLookup.suggestion,
      });
      addMissingFieldIssues(entry, contributionNumber);
      return;
    }

    if (roleLookup.status === 'unique' && contributorLookup.status === 'none') {
      setRoleMatch(entry, roleLookup.suggestion);
      addMissingFieldIssues(entry, contributionNumber);
      return;
    }

    entry.imported_agent_text = secondToken || undefined;
    entry.imported_role_text = secondToken || undefined;
    entry.issues.push(
      `Contribution ${contributionNumber}: token \`${secondToken}\` is ambiguous between contributor and role.`
    );
    return;
  }

  const [firstContributor, firstRole, secondContributor, secondRole] = await Promise.all([
    resolveContributorTokenAcrossAllTypes({
      token: firstToken,
      services,
      context,
      cache,
    }),
    resolveRoleToken({
      token: firstToken,
      services,
      context,
      cache,
    }),
    resolveContributorTokenAcrossAllTypes({
      token: secondToken,
      services,
      context,
      cache,
    }),
    resolveRoleToken({
      token: secondToken,
      services,
      context,
      cache,
    }),
  ]);

  const firstIsContributor = firstContributor.status === 'unique' && firstRole.status === 'none';
  const secondIsContributor = secondContributor.status === 'unique' && secondRole.status === 'none';
  const firstIsRole = firstRole.status === 'unique' && firstContributor.status === 'none';
  const secondIsRole = secondRole.status === 'unique' && secondContributor.status === 'none';

  if (firstIsContributor && secondIsRole) {
    setContributorMatch(entry, firstContributor);
    setRoleMatch(entry, secondRole.suggestion);
    return;
  }

  if (firstIsRole && secondIsContributor) {
    setContributorMatch(entry, secondContributor);
    setRoleMatch(entry, firstRole.suggestion);
    return;
  }

  entry.imported_agent_text = firstToken || secondToken || undefined;
  entry.imported_role_text = firstToken || secondToken || undefined;
  entry.issues.push(
    `Contribution ${contributionNumber}: the tuple \`(${tokens.join(', ')})\` could not be classified unambiguously.`
  );
}

export async function parseContributionCsvValue({
  rawValue,
  context,
  services,
}: {
  rawValue: string;
  context: EntityImportRuntimeContext;
  services: ContributionServices;
}): Promise<ParsedContributionCsvValue> {
  const parsedList = parseTupleList(rawValue);
  if (parsedList.issues.length > 0 || parsedList.tuples.length === 0) {
    return {
      entries: [],
      issues: parsedList.issues,
    };
  }

  const cache: ExactLookupCache = new Map();
  const entries = await Promise.all(
    parsedList.tuples.map(async (tupleText, index) => {
      const entry = createEntry(index, tupleText);
      const tokens = splitTupleTokens(tupleText);
      const contributionNumber = index + 1;

      if (tokens.length === 3) {
        await hydrateThreeSlotContribution({
          entry,
          tupleText,
          contributionNumber,
          services,
          context,
          cache,
        });
        return entry;
      }

      if (tokens.length === 2) {
        await hydrateTwoTokenContribution({
          entry,
          tokens,
          contributionNumber,
          services,
          context,
          cache,
        });
        return entry;
      }

      if (tokens.length === 1 && tokens[0]) {
        await hydrateSingleTokenContribution({
          entry,
          token: tokens[0],
          contributionNumber,
          services,
          context,
          cache,
        });
        return entry;
      }

      entry.issues.push(CONTRIBUTION_TUPLE_ERROR);
      return entry;
    })
  );

  return {
    entries,
    issues: [],
  };
}

export function parseLocationCsvValue(rawValue: string): ParsedLocationCsvValue {
  const normalized = rawValue.trim();
  if (!normalized) {
    return {
      rawValue: '',
      parsedValue: null,
      issues: [],
    };
  }

  const parsedSummary = parseLocationSummary(normalized);
  if (parsedSummary) {
    return {
      rawValue: summarizeLocation(parsedSummary),
      parsedValue: parsedSummary,
      issues: [],
    };
  }

  const tupleMatch = normalized.match(/^\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*\)$/);
  if (!tupleMatch) {
    return {
      rawValue: normalized,
      parsedValue: null,
      issues: [LOCATION_TUPLE_ERROR],
    };
  }

  const [x, y, z] = tupleMatch.slice(1).map((part) => Number(part.trim()));
  if ([x, y, z].some((value) => Number.isNaN(value))) {
    return {
      rawValue: normalized,
      parsedValue: null,
      issues: [LOCATION_TUPLE_ERROR],
    };
  }

  const parsedValue = { x, y, z };
  return {
    rawValue: summarizeLocation(parsedValue),
    parsedValue,
    issues: [],
  };
}
