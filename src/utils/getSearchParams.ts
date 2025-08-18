export type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export type SectionsProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export function getSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
): string | null {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
