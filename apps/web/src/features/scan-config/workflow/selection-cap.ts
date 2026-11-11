/** The `maxItems` cap ObiOne declares on a flat `model_identifier_multiple` field, if any. */
export function readFieldMaxItems(paramSchema: object): number | undefined {
  return 'maxItems' in paramSchema && typeof paramSchema.maxItems === 'number'
    ? paramSchema.maxItems
    : undefined;
}

export function isOverSelectionCap(selectedCount: number, maxSelections: number | undefined) {
  return typeof maxSelections === 'number' && selectedCount > maxSelections;
}

/** Picks stop at the cap; a picked row stays selectable so it can be unpicked. */
export function canSelectWithinCap({
  selected,
  selectedCount,
  maxSelections,
}: {
  selected: boolean;
  selectedCount: number;
  maxSelections: number | undefined;
}) {
  return typeof maxSelections !== 'number' || selected || selectedCount < maxSelections;
}

/** A shift-click range arrives as one batch, so new picks past `room` are dropped here. */
export function limitNewPicks<T extends { id: string }>({
  rows,
  currentRows,
  room,
}: {
  rows: T[];
  currentRows: readonly { id: string }[];
  room: number | undefined;
}) {
  if (room === undefined) return rows;
  const currentIds = new Set(currentRows.map((row) => row.id));
  let newPicksLeft = room - rows.filter((row) => currentIds.has(row.id)).length;
  return rows.filter((row) => {
    if (currentIds.has(row.id)) return true;
    newPicksLeft -= 1;
    return newPicksLeft >= 0;
  });
}

export function formatSelectionCap(selectedCount: number, maxSelections: number) {
  return `${selectedCount} / ${maxSelections} selected (max ${maxSelections} allowed)`;
}
