/**
 * Splits markdown into blocks at blank lines, keeping fenced code (which may hold blank lines)
 * in one piece. `joinBlocks(splitBlocks(x))` is `x` with its blank-line runs normalised.
 */
export function splitBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  let fenced = false;
  const flush = () => {
    if (current.length > 0) blocks.push(current.join('\n'));
    current = [];
  };
  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (!fenced && line.trim() === '') flush();
    else current.push(line);
  }
  flush();
  return blocks;
}

export function joinBlocks(blocks: string[]): string {
  return blocks.length > 0 ? `${blocks.join('\n\n')}\n` : '';
}
