import { atom, useAtom, useSetAtom } from 'jotai';
import { useCallback, useEffect, useState } from 'react';

/** What each report on show holds, by its path: its populations, and the one it shows. */
export type ReportPopulations = { populations: string[]; current: string };

/** Published by the viewers, for the picker over the statistics to list. */
export const reportPopulationsAtom = atom<Record<string, ReportPopulations>>({});

/**
 * The population chosen for each report, by its path: from the viewer's own
 * header or the picker over the statistics, and kept across the simulations of
 * a campaign, whose reports share their paths.
 */
export const chosenReportPopulationAtom = atom<Record<string, string>>({});

/**
 * The population a report shows - the one chosen for it, else `fallback` - and
 * a way to choose another. With a path the choice is shared with the picker
 * over the statistics, and what the report holds is published for it.
 */
export function useReportPopulation<Fallback extends string | undefined>(
  reportPath: string | undefined,
  populations: readonly string[],
  fallback: Fallback
): [string | Fallback, (name: string) => void] {
  const [chosenByReport, setChosenByReport] = useAtom(chosenReportPopulationAtom);
  // Outside a results page there is no path to share the choice by.
  const [ownChoice, setOwnChoice] = useState<string>();
  const chosen = reportPath ? chosenByReport[reportPath] : ownChoice;
  const current: string | Fallback =
    chosen !== undefined && populations.includes(chosen) ? chosen : fallback;

  const choose = useCallback(
    (name: string) => {
      if (reportPath) setChosenByReport((previous) => ({ ...previous, [reportPath]: name }));
      else setOwnChoice(name);
    },
    [reportPath, setChosenByReport]
  );

  const publish = useSetAtom(reportPopulationsAtom);
  const listed = populations.join('\n');
  useEffect(() => {
    if (!reportPath || current === undefined) return;
    publish((previous) => {
      const known = previous[reportPath];
      if (known?.current === current && known.populations.join('\n') === listed) return previous;
      return { ...previous, [reportPath]: { populations: listed.split('\n'), current } };
    });
  }, [reportPath, listed, current, publish]);

  return [current, choose];
}
