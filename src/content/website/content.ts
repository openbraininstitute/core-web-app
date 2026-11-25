import { usesSanityContent, websiteSlug } from './sources';

import type { ContentForEmail, EmailType } from '@/services/sanity/api/get-email-content';
import type { ContentForHero } from '@/services/sanity/api/get-hero-content';
import type { ContentForRichText } from '@/services/sanity/types/rtf-content';
import type { SanityShowcaseType } from '@/ui/segments/reports/obi-showcases/types';

/** Local content snapshots are lazy loaded on the server; the browser does not receive the whole website. */
type PageContent = { hero: ContentForHero; content: ContentForRichText };
const pages = async () =>
  (await import('./pages.json')).default as unknown as Record<string, PageContent>;

export async function getHeroContent(slug: string): Promise<ContentForHero> {
  if (usesSanityContent(slug))
    return (await import('@/services/sanity/api/get-hero-content')).getHeroContent(slug);
  const page = (await pages())[websiteSlug(slug)];
  if (!page) throw new Error(`Missing local website page: ${slug}`);
  return page.hero;
}

export async function getRTFContent(slug: string): Promise<ContentForRichText> {
  if (usesSanityContent(slug))
    return (await import('@/services/sanity/api/get-rtf-content')).getRTFContent(slug);
  const page = (await pages())[websiteSlug(slug)];
  if (!page) throw new Error(`Missing local website page: ${slug}`);
  return page.content;
}

interface WidgetContent {
  getMissionDownload: Awaited<
    ReturnType<typeof import('@/services/sanity/api/get-mission-download').getMissionDownload>
  >;
  getVirtualLabsBlocks: Awaited<
    ReturnType<typeof import('@/services/sanity/api/get-virtual-labs-content').getVirtualLabsBlocks>
  >;
  getFoundationsText: Awaited<
    ReturnType<typeof import('@/services/sanity/api/get-foundations-content').getFoundationsText>
  >;
  getFoundationsLinks: Awaited<
    ReturnType<typeof import('@/services/sanity/api/get-foundations-content').getFoundationsLinks>
  >;
  getPortalsTitle: Awaited<
    ReturnType<typeof import('@/services/sanity/api/get-portals-content').getPortalsTitle>
  >;
  getPortalsList: Awaited<
    ReturnType<typeof import('@/services/sanity/api/get-portals-content').getPortalsList>
  >;
  getMembers: Awaited<ReturnType<typeof import('@/services/sanity/api/get-members').getMembers>>;
  getCellToBrainContent: Awaited<
    ReturnType<typeof import('@/services/sanity/api/get-cell-to-brain').getCellToBrainContent>
  >;
  getPricingFeatures: Awaited<
    ReturnType<typeof import('@/services/sanity/api/get-pricing-features').getPricingFeatures>
  >;
  getPriceListContent: Awaited<
    ReturnType<typeof import('@/services/sanity/api/get-price-list-content').getPriceListContent>
  >;
  getWidgetHero: Awaited<
    ReturnType<typeof import('@/services/sanity/api/get-widget-hero').getWidgetHero>
  >;
  getSwipeableList: Awaited<
    ReturnType<typeof import('@/services/sanity/api/get-swipeable-list').getSwipeableList>
  >;
  getMultipleMember: Awaited<
    ReturnType<typeof import('@/services/sanity/api/get-multiple-member').getMultipleMember>
  >;
  getRepositoriesContent: Awaited<
    ReturnType<
      typeof import('@/services/sanity/api/get-repositories-content').getRepositoriesContent
    >
  >;
  getSpecialContributors: Awaited<
    ReturnType<
      typeof import('@/services/sanity/api/get-special-contributors').getSpecialContributors
    >
  >;
  getMilestones: Awaited<
    ReturnType<typeof import('@/services/sanity/api/get-milestones').getMilestones>
  >;
  getNewsList: Awaited<
    ReturnType<typeof import('@/services/sanity/api/get-news-list').getNewsList>
  >;
  emails: Record<EmailType, ContentForEmail | null>;
}
async function widgets(): Promise<WidgetContent> {
  return (await import('./widgets.json')).default as unknown as WidgetContent;
}

export async function getMissionDownload() {
  return (await widgets()).getMissionDownload;
}

export async function getVirtualLabsBlocks() {
  return (await widgets()).getVirtualLabsBlocks;
}

export async function getFoundationsText() {
  return (await widgets()).getFoundationsText;
}

export async function getFoundationsLinks() {
  return (await widgets()).getFoundationsLinks;
}

export async function getPortalsTitle() {
  return (await widgets()).getPortalsTitle;
}

export async function getPortalsList() {
  return (await widgets()).getPortalsList;
}

export async function getMembers() {
  return (await widgets()).getMembers;
}

export async function getCellToBrainContent() {
  return (await widgets()).getCellToBrainContent;
}

export async function getPricingFeatures() {
  return (await widgets()).getPricingFeatures;
}

export async function getPriceListContent() {
  return (await widgets()).getPriceListContent;
}

export async function getWidgetHero() {
  return (await widgets()).getWidgetHero;
}

export async function getSwipeableList() {
  return (await widgets()).getSwipeableList;
}

export async function getMultipleMember() {
  return (await widgets()).getMultipleMember;
}

export async function getRepositoriesContent() {
  return (await widgets()).getRepositoriesContent;
}

export async function getSpecialContributors() {
  return (await widgets()).getSpecialContributors;
}

export async function getMilestones() {
  return (await widgets()).getMilestones;
}

export async function getNewsList(length = 0, start = 0) {
  const news = (await widgets()).getNewsList;
  return length ? news.slice(start, start + length) : news.slice(start);
}

export async function getEmailContent(type: EmailType) {
  return (await widgets()).emails[type];
}

export async function getFeaturesContent(): Promise<
  Awaited<
    ReturnType<typeof import('@/services/sanity/api/get-features-content').getFeaturesContent>
  >
> {
  return (await import('./features.json')).default;
}
export async function getGalleryContent(): Promise<
  Awaited<ReturnType<typeof import('@/services/sanity/api/get-gallery-content').getGalleryContent>>
> {
  return (await import('./gallery.json')).default;
}
export async function getSinglePrices(): Promise<
  Awaited<ReturnType<typeof import('@/services/sanity/api/get-single-prices').getSinglePrices>>
> {
  return (await import('./pricing.json')).default.prices;
}
export async function getCreditsPacks(): Promise<
  Awaited<ReturnType<typeof import('@/services/sanity/api/get-credits-packs').getCreditsPacks>>
> {
  return (await import('./pricing.json')).default.creditsPacks;
}
export async function getPricingContent(): Promise<
  Awaited<ReturnType<typeof import('@/services/sanity/api/get-pricing-content').getPricingContent>>
> {
  return (await import('./pricing.json')).default.plans;
}
export async function getShowcaseProjects() {
  return (await import('./showcases.json')).default.projects;
}
export async function getShowcase(slug: string): Promise<SanityShowcaseType | null> {
  const details = (await import('./showcases.json')).default.details as unknown as Record<
    string,
    SanityShowcaseType
  >;
  return details[slug] ?? null;
}
export async function getLocalMetadata(slug: string) {
  const metadata = (await import('./metadata.json')).default;
  return metadata[websiteSlug(slug) as keyof typeof metadata] ?? null;
}
