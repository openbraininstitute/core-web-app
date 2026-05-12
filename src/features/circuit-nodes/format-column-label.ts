export function formatColumnLabel(name: string): string {
  const spaced = name.replace(/_/g, ' ');
  return spaced.length === 0 ? spaced : spaced[0].toUpperCase() + spaced.slice(1);
}
