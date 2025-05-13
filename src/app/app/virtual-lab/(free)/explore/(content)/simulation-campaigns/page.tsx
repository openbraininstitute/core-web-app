'use client';

import dynamic from 'next/dynamic';

const SimulationCampaignListView = dynamic(
  () => import('@/components/explore-section/ExploreSectionListingView/SimulationCampaignListView'),
  { ssr: false }
);

import { DataType } from '@/constants/explore-section/list-views';

export default function SimulationCampaignPage() {
  return <SimulationCampaignListView dataType={DataType.SimulationCampaigns} />;
}
