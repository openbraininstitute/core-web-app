'use client';

import { Select } from 'antd';
import { useMemo } from 'react';

import type { GalleryContentProps } from '@/api/sanity/gallery/route';

type GalleryFiltersProps = {
  galleryContent: GalleryContentProps[];
  selectedBrainRegion: string | null;
  // selectedMediaType: string | null;
  onBrainRegionChange: (value: string | null) => void;
  // onMediaTypeChange: (value: string | null) => void;
};

export default function GalleryFilters({
  galleryContent,
  selectedBrainRegion,
  // selectedMediaType,
  onBrainRegionChange,
  // onMediaTypeChange,
}: GalleryFiltersProps) {
  const brainRegions = useMemo(() => {
    const regions = new Set<string>();
    galleryContent.forEach((item) => {
      if (item.brainRegion) {
        regions.add(item.brainRegion);
      }
    });
    return Array.from(regions).sort();
  }, [galleryContent]);

  // const mediaTypes = useMemo(() => {
  //   const types = new Set<string>();
  //   galleryContent.forEach((item) => {
  //     if (item.mediaType) {
  //       types.add(item.mediaType);
  //     }
  //   });
  //   return Array.from(types).sort();
  // }, [galleryContent]);

  return (
    <div
      className="grid grid-cols-2 gap-4 md:flex"
      style={{ fontFamily: 'var(--font-titillium-web)' }}
    >
      <div className="flex flex-col gap-2">
        <div className="text-sm font-semibold">Brain Region</div>
        <Select
          aria-label="Brain Region filter"
          placeholder="All brain regions"
          allowClear
          value={selectedBrainRegion ?? 'all'}
          onChange={(value) => onBrainRegionChange(value === 'all' ? null : value)}
          className="min-w-[200px] capitalize"
          options={[
            { value: 'all', label: 'All' },
            ...brainRegions.map((region) => ({
              value: region,
              label: region,
            })),
          ]}
        />
      </div>
      {/* <div className="flex flex-col gap-2">
        <div className="text-sm font-semibold">Media Type</div>
        <Select
          aria-label="Media Type filter"
          placeholder="All media types"
          allowClear
          value={selectedMediaType ?? 'all'}
          onChange={(value) => onMediaTypeChange(value === 'all' ? null : value)}
          className="min-w-[200px]"
          options={[
            { value: 'all', label: 'All' },
            ...mediaTypes.map((type) => ({
              value: type,
              label: type.charAt(0).toUpperCase() + type.slice(1),
            })),
          ]}
        />
      </div> */}
    </div>
  );
}
