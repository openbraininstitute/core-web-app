export type ShowcaseCategoryStyle = {
  color: string;
  borderColor: string;
};

const DEFAULT_CATEGORY_STYLE: ShowcaseCategoryStyle = {
  color: '#00317d',
  borderColor: '#69c0ff',
};

const CATEGORY_STYLES: Record<string, ShowcaseCategoryStyle> = {
  model: { color: '#00317d', borderColor: '#096dd9' },
  simulation: { color: '#531dab', borderColor: '#b37feb' },
  notebook: { color: '#135200', borderColor: '#73d13d' },
  analysis: { color: '#874d00', borderColor: '#ffc53d' },
  workflow: { color: '#003a8c', borderColor: '#40a9ff' },
  data: { color: '#002766', borderColor: '#91d5ff' },
  publication: { color: '#820014', borderColor: '#ff7875' },
};

function normalizeCategoryKey(category: string): string {
  return category.trim().toLowerCase().replace(/\s+/g, '-');
}

export function getShowcaseCategoryStyle(
  category: string | null | undefined
): ShowcaseCategoryStyle {
  if (!category) return DEFAULT_CATEGORY_STYLE;

  const normalized = normalizeCategoryKey(category);
  return CATEGORY_STYLES[normalized] ?? DEFAULT_CATEGORY_STYLE;
}
