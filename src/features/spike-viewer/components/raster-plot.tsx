'use client';

import { Checkbox, Empty } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useRasterRenderer } from '@/features/spike-viewer/hooks/use-raster-renderer';
import { POPULATION_COLORS } from '@/features/spike-viewer/renderer/raster-renderer';

import type { SpikeData } from '@/features/spike-viewer/spike-trace';

type RasterPlotProps = {
  data: SpikeData;
};

export default function RasterPlot({ data }: RasterPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setVisiblePopulations } = useRasterRenderer(containerRef, data);

  const [selectedPopulations, setSelectedPopulations] = useState<Set<string>>(
    new Set(data.populations.map((p) => p.name))
  );

  // Sync visibility when selection changes
  useEffect(() => {
    setVisiblePopulations(selectedPopulations);
  }, [selectedPopulations, setVisiblePopulations]);

  const togglePopulation = (name: string, checked: boolean) => {
    setSelectedPopulations((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(name);
      } else {
        next.delete(name);
      }
      return next;
    });
  };

  const totalSpikes = useMemo(() => {
    return data.populations.reduce((sum, pop) => sum + pop.timestamps.length, 0);
  }, [data.populations]);

  if (totalSpikes === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Empty description="No spikes recorded during this simulation" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex flex-wrap items-center gap-4">
        {data.populations.length === 1 ? (
          <span style={{ color: POPULATION_COLORS[0] }}>
            Population: {data.populations[0].name} (
            {data.populations[0].timestamps.length.toLocaleString()} spikes)
          </span>
        ) : (
          data.populations.map((pop, idx) => (
            <Checkbox
              key={pop.name}
              checked={selectedPopulations.has(pop.name)}
              onChange={(e) => togglePopulation(pop.name, e.target.checked)}
            >
              <span style={{ color: POPULATION_COLORS[idx % POPULATION_COLORS.length] }}>
                Population: {pop.name} ({pop.timestamps.length.toLocaleString()} spikes)
              </span>
            </Checkbox>
          ))
        )}
        <span className="ml-auto text-xs text-gray-400">
          Drag to zoom · Shift+drag to pan · Double-click to reset
        </span>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1" />
    </div>
  );
}
