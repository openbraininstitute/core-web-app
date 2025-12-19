export type SearchParams = Record<string, string | string[] | undefined>;

function first(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val;
}

function isNil(value: unknown): value is null | undefined {
  return value == null;
}

export function buildLink(
  searchParams: SearchParams,
  updates: Record<string, string | undefined>,
  options?: {
    preserve?: boolean;
    remove?: string[];
    activeKey?: string;
    activeValue?: string;
  },
): { href: string; isActive: boolean } {
  const { preserve = true, remove = [], activeKey, activeValue } = options ?? {};

  const params = new URLSearchParams();

  if (preserve) {
    for (const [key, value] of Object.entries(searchParams ?? {})) {
      if (remove.includes(key)) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => void params.append(key, v));
      } else if (value !== undefined) {
        void params.set(key, value);
      }
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (isNil(value)) continue;
    params.set(key, value);
  }

  let isActive = false;
  if (activeKey) {
    const current = first(searchParams?.[activeKey]);
    const target = activeValue ?? updates[activeKey];
    isActive = current === target;
  }

  return { href: `?${params.toString()}`, isActive };
}
