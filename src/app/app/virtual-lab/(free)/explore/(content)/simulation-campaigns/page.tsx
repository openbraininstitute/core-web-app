'use client';

import dynamic from 'next/dynamic';

import { DataType } from '@/constants/explore-section/list-views';

const SimulationCampaignListView = dynamic(
  () => import('@/components/explore-section/ExploreSectionListingView/SimulationCampaignListView'),
  { ssr: false }
);

export default function SimulationCampaignPage() {
  return <SimulationCampaignListView dataType={DataType.SimulationCampaigns} />;
}
