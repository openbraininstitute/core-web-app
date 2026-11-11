import dynamic from 'next/dynamic';

const SimulationPlotDynamic = dynamic(() => import('./simulation-plot'), {
  ssr: false,
});

export default SimulationPlotDynamic;
