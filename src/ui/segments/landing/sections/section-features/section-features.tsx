import { getFeaturesContent } from '@/services/sanity/api/get-features-content';

import FeatureBlock from './feature-block';

export default async function SectionFeatures() {
  const blocks = await getFeaturesContent();

  if (blocks.length === 0) {
    return (
      <div className="relative w-full px-4 sm:px-8 lg:px-32 py-16">
        <p className="text-gray-500">No features content available.</p>
      </div>
    );
  }

  return (
    <div className="relative w-screen">
      {blocks.map((block, index) => (
        <FeatureBlock key={block.titleH1 ?? block.titleH2 ?? index} content={block} />
      ))}
    </div>
  );
}
