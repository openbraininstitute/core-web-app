/** A cell as CSV: quoted where it holds a comma, a quote or a line break. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** The rows of some columns as CSV lines, each column given as its cells down the rows. */
export function csvLines(columns: readonly (readonly unknown[])[], rows: number): string {
  let text = '';
  for (let row = 0; row < rows; row++) {
    for (let c = 0; c < columns.length; c++) {
      if (c > 0) text += ',';
      text += csvCell(columns[c][row]);
    }
    text += '\r\n';
  }
  return text;
}
