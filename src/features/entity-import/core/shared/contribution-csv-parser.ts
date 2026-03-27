'use client';

import { AgentType, type TAgentType } from '@/ui/segments/contribute/shared/types';

import type { IEntityImportRuntimeContext } from '@/features/entity-import/core/adapter';
import type { ISuggestion } from '@/features/entity-import/core/contracts';
import type { IEntityImportContributionLookupServices } from '@/features/entity-import/core/shared/common-query-services';

const ExactLookupResultStatus = {
  None: 'none',
  Ambiguous: 'ambiguous',
  Unique: 'unique',
} as const;

type TExactLookupResult =
  | { status: typeof ExactLookupResultStatus.None }
  | { status: typeof ExactLookupResultStatus.Ambiguous }
  | { status: typeof ExactLookupResultStatus.Unique; suggestion: ISuggestion };

type TExactLookupCache = Map<string, Promise<TExactLookupResult>>;

export interface IParsedContributionCsvEntry {
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

export interface IParsedContributionCsvValue {
  entries: Array<IParsedContributionCsvEntry>;
  issues: Array<string>;
}

const CONTRIBUTION_TUPLE_ERROR =
  'Contributions must be provided as tuples in the form [(type, name, role), ...].';
const EXACT_QUERY_PAGE_SIZE = 100;

const CONTRIBUTOR_QUERY_FIELDS = {
  [AgentType.Person.key]: 'pref_label__ilike',
  [AgentType.Organization.key]: 'pref_label__ilike',
  [AgentType.Consortium.key]: 'pref_label__ilike',
} as const;

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function createEntry(index: number, tupleText: string): IParsedContributionCsvEntry {
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

function createStructureOnlyContributionEntry(
  tupleText: string,
  index: number
): IParsedContributionCsvEntry {
  const entry = createEntry(index, tupleText);
  const contributionNumber = index + 1;
  const tokens = splitTupleTokens(tupleText);

  if (tokens.length === 3) {
    const [typeToken = '', agentToken = '', roleToken = ''] = tokens;
    const resolvedType = resolveAgentTypeToken(typeToken);

    if (typeToken && !resolvedType) {
      entry.issues.push(
        `Contribution ${contributionNumber}: \`${typeToken}\` is not a supported contributor type.`
      );
      entry.imported_type_text = typeToken;
    }

    if (resolvedType) {
      entry.agent_type = resolvedType;
    }

    entry.imported_agent_text = agentToken || undefined;
    entry.imported_role_text = roleToken || undefined;
    return entry;
  }

  if (tokens.length === 2) {
    entry.imported_agent_text = tokens[0] || undefined;
    entry.imported_role_text = tokens[1] || undefined;
    return entry;
  }

  if (tokens.length === 1 && tokens[0]) {
    entry.imported_agent_text = tokens[0];
    entry.imported_role_text = tokens[0];
    return entry;
  }

  entry.issues.push(CONTRIBUTION_TUPLE_ERROR);
  return entry;
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

function toExactLookupResult(suggestions: Array<ISuggestion>, query: string): TExactLookupResult {
  const normalizedQuery = normalizeToken(query);
  const matches = suggestions.filter(
    (suggestion) =>
      normalizeToken(suggestion.label) === normalizedQuery ||
      normalizeToken(suggestion.value) === normalizedQuery
  );

  if (matches.length === 1) {
    return {
      status: ExactLookupResultStatus.Unique,
      suggestion: matches[0],
    };
  }

  if (matches.length > 1) {
    return { status: ExactLookupResultStatus.Ambiguous };
  }

  return { status: ExactLookupResultStatus.None };
}

function setContributorMatch(
  entry: IParsedContributionCsvEntry,
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

function setRoleMatch(entry: IParsedContributionCsvEntry, suggestion: ISuggestion) {
  entry.role_id = suggestion.value;
  entry.role_label = suggestion.label;
  entry.imported_role_text = undefined;
}

function addMissingFieldIssues(entry: IParsedContributionCsvEntry, contributionNumber: number) {
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
  cache: TExactLookupCache;
  cacheKey: string;
  query: string;
  querySuggestions: IEntityImportContributionLookupServices[keyof IEntityImportContributionLookupServices];
  queryField: 'pref_label__ilike' | 'name__ilike';
  context: IEntityImportRuntimeContext;
}): Promise<TExactLookupResult> {
  const normalizedQuery = normalizeToken(query);
  if (!normalizedQuery) {
    return { status: ExactLookupResultStatus.None };
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
  services: IEntityImportContributionLookupServices;
  context: IEntityImportRuntimeContext;
  cache: TExactLookupCache;
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
      match.result.status === ExactLookupResultStatus.Unique
  );
  const hasAmbiguousMatch = matches.some(
    (match) => match.result.status === ExactLookupResultStatus.Ambiguous
  );

  if (uniqueMatches.length === 1 && !hasAmbiguousMatch) {
    return {
      status: ExactLookupResultStatus.Unique,
      agentType: uniqueMatches[0].agentType,
      suggestion: uniqueMatches[0].result.suggestion,
    };
  }

  if (uniqueMatches.length > 1 || hasAmbiguousMatch) {
    return { status: ExactLookupResultStatus.Ambiguous };
  }

  return { status: ExactLookupResultStatus.None };
}

async function resolveRoleToken({
  token,
  services,
  context,
  cache,
}: {
  token: string;
  services: IEntityImportContributionLookupServices;
  context: IEntityImportRuntimeContext;
  cache: TExactLookupCache;
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
  services: IEntityImportContributionLookupServices;
  context: IEntityImportRuntimeContext;
  cache: TExactLookupCache;
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
  entry: IParsedContributionCsvEntry;
  tupleText: string;
  contributionNumber: number;
  services: IEntityImportContributionLookupServices;
  context: IEntityImportRuntimeContext;
  cache: TExactLookupCache;
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

      if (contributorLookup.status === ExactLookupResultStatus.Unique) {
        setContributorMatch(entry, {
          agentType: entry.agent_type,
          suggestion: contributorLookup.suggestion,
        });
      } else if (contributorLookup.status === ExactLookupResultStatus.Ambiguous) {
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

      if (contributorLookup.status === ExactLookupResultStatus.Unique) {
        setContributorMatch(entry, contributorLookup);
        entry.imported_type_text = undefined;
      } else if (contributorLookup.status === ExactLookupResultStatus.Ambiguous) {
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

    if (roleLookup.status === ExactLookupResultStatus.Unique) {
      setRoleMatch(entry, roleLookup.suggestion);
    } else if (roleLookup.status === ExactLookupResultStatus.Ambiguous) {
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
  entry: IParsedContributionCsvEntry;
  token: string;
  contributionNumber: number;
  services: IEntityImportContributionLookupServices;
  context: IEntityImportRuntimeContext;
  cache: TExactLookupCache;
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

  if (
    contributorLookup.status === ExactLookupResultStatus.Unique &&
    roleLookup.status === ExactLookupResultStatus.None
  ) {
    setContributorMatch(entry, contributorLookup);
    entry.imported_agent_text = undefined;
    addMissingFieldIssues(entry, contributionNumber);
    return;
  }

  if (
    roleLookup.status === ExactLookupResultStatus.Unique &&
    contributorLookup.status === ExactLookupResultStatus.None
  ) {
    setRoleMatch(entry, roleLookup.suggestion);
    entry.imported_role_text = undefined;
    addMissingFieldIssues(entry, contributionNumber);
    return;
  }

  if (
    contributorLookup.status !== ExactLookupResultStatus.None &&
    roleLookup.status !== ExactLookupResultStatus.None
  ) {
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
  entry: IParsedContributionCsvEntry;
  tokens: Array<string>;
  contributionNumber: number;
  services: IEntityImportContributionLookupServices;
  context: IEntityImportRuntimeContext;
  cache: TExactLookupCache;
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
        : Promise.resolve<TExactLookupResult>({ status: ExactLookupResultStatus.None }),
      secondToken
        ? resolveRoleToken({
            token: secondToken,
            services,
            context,
            cache,
          })
        : Promise.resolve<TExactLookupResult>({ status: ExactLookupResultStatus.None }),
    ]);

    if (
      contributorLookup.status === ExactLookupResultStatus.Unique &&
      roleLookup.status === ExactLookupResultStatus.None
    ) {
      setContributorMatch(entry, {
        agentType: resolvedType,
        suggestion: contributorLookup.suggestion,
      });
      addMissingFieldIssues(entry, contributionNumber);
      return;
    }

    if (
      roleLookup.status === ExactLookupResultStatus.Unique &&
      contributorLookup.status === ExactLookupResultStatus.None
    ) {
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

  const firstIsContributor =
    firstContributor.status === ExactLookupResultStatus.Unique &&
    firstRole.status === ExactLookupResultStatus.None;
  const secondIsContributor =
    secondContributor.status === ExactLookupResultStatus.Unique &&
    secondRole.status === ExactLookupResultStatus.None;
  const firstIsRole =
    firstRole.status === ExactLookupResultStatus.Unique &&
    firstContributor.status === ExactLookupResultStatus.None;
  const secondIsRole =
    secondRole.status === ExactLookupResultStatus.Unique &&
    secondContributor.status === ExactLookupResultStatus.None;

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
  lookupCache,
  resolveExactMatches = true,
}: {
  rawValue: string;
  context: IEntityImportRuntimeContext;
  services: IEntityImportContributionLookupServices;
  lookupCache?: Map<string, unknown>;
  resolveExactMatches?: boolean;
}): Promise<IParsedContributionCsvValue> {
  const parsedList = parseTupleList(rawValue);
  if (parsedList.issues.length > 0 || parsedList.tuples.length === 0) {
    return {
      entries: [],
      issues: parsedList.issues,
    };
  }

  if (!resolveExactMatches) {
    return {
      entries: parsedList.tuples.map((tupleText, index) =>
        createStructureOnlyContributionEntry(tupleText, index)
      ),
      issues: [],
    };
  }

  const cache =
    (lookupCache as TExactLookupCache | undefined) ??
    new Map<string, Promise<TExactLookupResult>>();
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
