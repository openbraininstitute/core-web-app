'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { snakeCase } from 'es-toolkit/compat';
import { useResetAtom } from 'jotai/utils';
import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';

import { circuitRepresentationViewAtom } from '@/ui/segments/explore/circuit/helpers';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  makeDataKey,
  makeDataListStoreAtomsInitialValue,
  useDataListStoreSession,
} from '@/ui/segments/data-table/elements/helpers';
import {
  coreSearchStringAtom,
  corePageNumberAtom,
  coreSortStateAtom,
  coreFiltersAtom,
} from '@/ui/segments/data-table/elements/context';
import { WorkspaceContext } from '@/types/common';
import { isBrowser } from '@/utils/environment';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceScope } from '@/constants';
import type { KebabCase } from '@/utils/type';

export function SetupDataListStoreOnMount({
  dataType,
  dataKey,
}: {
  dataType: TExtendedEntitiesTypeDict;
  dataKey: string;
}) {
  const isMounted = useRef(false);
  const { sessionValue: dataListStoreSession } = useDataListStoreSession({
    dataKey,
    dataType,
  });

  const [, updateSortState] = useAtom(coreSortStateAtom({ key: dataKey }));
  const [, updateSearchString] = useAtom(coreSearchStringAtom(dataKey));
  const [, updatePageNumber] = useAtom(corePageNumberAtom(dataKey));
  const [, updateFilters] = useAtom(coreFiltersAtom({ dataType, key: dataKey }));
  const [, updateCircuitView] = useAtom(circuitRepresentationViewAtom);

  useEffect(() => {
    // set from session only in first render
    if (!isMounted.current) {
      updateSearchString(dataListStoreSession.Search);
      updateCircuitView(dataListStoreSession.View);
      updateFilters(dataListStoreSession.Filters);
      updatePageNumber(dataListStoreSession.Page);
      updateSortState(dataListStoreSession.Sort);
      isMounted.current = true;
    }

    return () => {
      isMounted.current = false;
    };
  }, [dataListStoreSession]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export function TeardownDataListStoreOnUnmount() {
  const { virtualLabId, projectId } = useWorkspace();
  const params = useParams<WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict> }>();
  const scope = (useSearchParams().get('scope') ?? WorkspaceScope.Public) as TWorkspaceScope;
  const dataType = snakeCase(params.type) as TExtendedEntitiesTypeDict;
  const dataKey = makeDataKey({
    virtualLabId,
    projectId,
    dataType,
    section: WorkspaceSection.Data,
    scope,
  });
  const [, updateSortState] = useAtom(coreSortStateAtom({ key: dataKey }));
  const [, updateSearchString] = useAtom(coreSearchStringAtom(dataKey));
  const [, updateFilters] = useAtom(coreFiltersAtom({ dataType, key: dataKey }));
  const [, updateCircuitView] = useAtom(circuitRepresentationViewAtom);
  const updatePageNumber = useResetAtom(corePageNumberAtom(dataKey));

  const defaultAtomValues = makeDataListStoreAtomsInitialValue({ dataType });

  useEffect(() => {
    return () => {
      updatePageNumber();
      updateSearchString('');
      updateSortState(defaultAtomValues.Sort);
      updateFilters(defaultAtomValues.Filters);
      updateCircuitView(defaultAtomValues.View);
      if (isBrowser()) {
        window.sessionStorage.removeItem(dataKey);
      }
    };
  }, [dataKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
