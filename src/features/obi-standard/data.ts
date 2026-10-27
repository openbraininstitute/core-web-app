import raw from './data/standard-data.json';

import type { StandardData, StdCategory, StdEntity } from './types';

export const standard = raw as StandardData;

export const stdEntities = standard.entities;
export const stdCategories = standard.categories;
export const stdContentTypes = standard.contentTypes;

const bySlug = new Map(stdEntities.map((e) => [e.slug, e]));

export function getStdEntity(slug: string): StdEntity | undefined {
  return bySlug.get(slug);
}

export function stdEntitiesByCategory(): { category: StdCategory; items: StdEntity[] }[] {
  return stdCategories
    .map((category) => ({
      category,
      items: stdEntities.filter((e) => e.category === category.id),
    }))
    .filter((group) => group.items.length > 0);
}
