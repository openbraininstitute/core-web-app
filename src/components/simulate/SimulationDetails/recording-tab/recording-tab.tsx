'use client'

import { MorphoViewerSimul } from '@bbp/morphoviewer'
import { SpinnerIcon } from '@bprogress/next'
import dynamic from 'next/dynamic'
import React, { Fragment } from 'react'

import IconPlus from '@/components/icons/Plus'
import { SIMULATION_COLORS } from '@/constants/simulate/single-neuron'
import { cn } from '@/utils/css-class'

import { useMorphology } from './hooks'

import type { PlotData } from '@/services/bluenaas-single-cell/types'

import styles from './recording-tab.module.css'

const PlotRenderer = dynamic(
  () => import('@/features/entities/neuron-simulation/experiment/visualization/plot-renderer'),
  {
    ssr: false,
  }
)

type Props = {
  recordings: Record<string, PlotData>
  meModelId: string
}

export default function ResultsTab({ recordings }: Props) {
  // @TODO: restore this part after phase 2: when small-scale-simulator is in staging
  // const [collapsed, setCollapsed] = React.useState(true);
  // const tree = useMorphology(meModelId);
  // const spikes = useSpikes(recordings);
  const collapsed = true
  const timelineManager = useTimelineManager()

  return (
    <div className={cn(styles.layout, collapsed && styles.collapsed)}>
      <div className={styles.plotsContainer}>
        {Object.entries(recordings).map(([key, value]) => {
          return (
            <Fragment key={key}>
              <div className="flex w-full flex-col items-start justify-start">
                <div className="flex w-full flex-col">
                  <PlotRenderer
                    withTitle
                    title={key}
                    type="simulation"
                    name={key}
                    isDownloadable={!!value.length}
                    onlyAmplitudeLegend={false}
                    data={value.map((v, i) => ({ ...v, line: { color: SIMULATION_COLORS[i] } }))}
                    className="min-h-[320px] w-full"
                    plotConfig={{
                      yAxisTitle: 'Voltage [mV]',
                      showDefaultLegends: true,
                    }}
                  />
                </div>
                {!collapsed && <SpikesTimeline manager={timelineManager} />}
              </div>
              <div className="my-5 h-px w-full bg-gray-200 last:hidden" />
            </Fragment>
          )
        })}
      </div>
      {/* @TODO: restore this part after phase 2: when small-scale-simulator is in staging */}
      {/* <div className={cn(styles.morphoViewerSimulContainer)}>
        {tree &&
          (collapsed ? (
            <button type="button" onClick={() => setCollapsed(false)}>
              <IconPlus />
              <div>Spike activity</div>
            </button>
          ) : (
            <MorphoViewerSimul
              morphology={tree}
              spikes={spikes}
              onReady={timelineManager.onReady}
              onClose={() => setCollapsed(true)}
            />
          ))}
        {!tree && (
          <div className={styles.spinnerContainer}>
            <IconSpinner />
            <div>Loading morphology...</div>
          </div>
        )}
      </div> */}
    </div>
  )
}
