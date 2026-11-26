'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState } from 'react';

import styles from './model-cube-field.module.css';

const ExploreBrain = dynamic(
  () =>
    import('@/ui/segments/project/brains-walkthrough/brain-views').then(
      (module) => module.FlyInBrain
    ),
  { ssr: false }
);
const FlySimulation = dynamic(
  () =>
    import('@/ui/segments/project/brains-walkthrough/floating-model').then(
      (module) => module.ActiveMaleCns
    ),
  { ssr: false }
);

export const CUBE_GROUPS = ['build', 'explore', 'inspect', 'simulate'] as const;
export type CubeGroup = (typeof CUBE_GROUPS)[number];

const CUBES: {
  id: string;
  group: CubeGroup;
  label: string;
  image: string;
  row: number;
  column: number;
  live?: 'explore' | 'simulate' | 'mesh';
}[] = [
  {
    id: 'circuit',
    group: 'build',
    label: 'Build circuit models',
    image: '/images/start/walkthrough/landing-microcircuit-large.webp',
    row: 2,
    column: 4,
  },
  {
    id: 'cell',
    group: 'build',
    label: 'Build neuron models',
    image: '/images/start/examples/human-pyramidal.jpg',
    row: 1,
    column: 3,
  },
  {
    id: 'brain',
    group: 'explore',
    label: 'Explore brain models',
    image: '/images/start/examples/flywire-1pct.jpg',
    row: 3,
    column: 4,
    live: 'explore',
  },
  {
    id: 'region',
    group: 'explore',
    label: 'Explore brain regions',
    image: '/images/start/examples/male-cns.jpg',
    row: 0,
    column: 4,
  },
  {
    id: 'mesh',
    group: 'inspect',
    label: 'Inspect neuron meshes',
    image: '/images/landing-science/em-cell-mesh-poster.png',
    row: 4,
    column: 4,
    live: 'mesh',
  },
  {
    id: 'pair',
    group: 'inspect',
    label: 'Inspect neuronal connections',
    image: '/images/start/examples/microns.jpg',
    row: 5,
    column: 1,
  },
  {
    id: 'fly',
    group: 'simulate',
    label: 'Simulate fly-neuron activity',
    image: '/images/start/walkthrough/landing-male-cns-large.webp',
    row: 3,
    column: 3,
    live: 'simulate',
  },
  {
    id: 'network',
    group: 'simulate',
    label: 'Simulate circuit activity',
    image: '/images/start/examples/nbs1-hex0-l6.jpg',
    row: 5,
    column: 0,
  },
];

const CELL_WIDTH = 20;
const ROW_STEP = (CELL_WIDTH / 0.87) * 0.75;
function cellPosition(row: number, column: number) {
  return {
    left: `${(column + (row % 2) / 2) * CELL_WIDTH}%`,
    top: `${row * ROW_STEP}%`,
    width: `${CELL_WIDTH}%`,
  };
}
const EMPTY_CELLS = Array.from({ length: 6 }, (_, row) =>
  Array.from({ length: 7 }, (_, index) => ({ row, column: index - 2 }))
)
  .flat()
  .filter(({ row, column }) => {
    if (column === -2) return row === 2 || row === 3;
    if (row === 0) return column >= 0 && column <= 2;
    if (row === 5) return column >= 0 && column <= 2;
    if (column === 4) return row >= 1 && row <= 3;
    return true;
  })
  .filter((cell) => !CUBES.some((cube) => cube.row === cell.row && cube.column === cell.column));

/** A capability is a family of models: color and depth move together, rather than replacing the whole scene. */
export function ModelCubeField({
  group,
  playing,
  reduced,
  onSelect,
}: {
  group: CubeGroup;
  playing: boolean;
  reduced: boolean;
  onSelect: (group: CubeGroup) => void;
}) {
  return (
    <div className={styles.field} data-testid="model-cube-field" data-group={group}>
      <div className={styles.cluster}>
        <div className={styles.leftTrail} aria-hidden="true">
          {EMPTY_CELLS.map(({ row, column }) => (
            <span
              key={`${row}-${column}`}
              className={styles.trailCube}
              style={{
                ...cellPosition(row, column),
                opacity: column === -2 ? 0.08 : column === -1 ? 0.32 : 0.9,
              }}
            >
              <span className={styles.shell}>
                <span className={styles.faces} />
              </span>
            </span>
          ))}
        </div>
        <div className={styles.raisedLayer} aria-hidden="true">
          {[
            [0, 0, 1.18],
            [1, 1, 1.1],
            [2, -1, 1.3],
            [2, 3, 1.13],
            [3, 1, 1.12],
            [4, 0, 1.2],
            [4, 3, 1.25],
          ].map(([row, column, scale]) => (
            <span
              key={`${row}-${column}`}
              className={styles.raisedCube}
              style={{
                ...cellPosition(row, column),
                transform: `translateY(-15%) scale(${scale})`,
                opacity: column < 0 ? 0.32 : 0.95,
              }}
            >
              <span className={styles.shell}>
                <span className={styles.faces} />
              </span>
            </span>
          ))}
        </div>
        {CUBES.map((cube) => (
          <button
            type="button"
            key={cube.id}
            className={styles.cube}
            data-active={group === cube.group}
            data-playing={playing && !reduced}
            data-cube-group={cube.group}
            aria-pressed={group === cube.group}
            aria-label={cube.label}
            onClick={() => onSelect(cube.group)}
            style={cellPosition(cube.row, cube.column)}
          >
            <span className={styles.shell}>
              <span className={styles.faces} />
              <span className={styles.content}>
                <CubeModel
                  cube={cube}
                  active={group === cube.group}
                  playing={playing}
                  reduced={reduced}
                />
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CubeModel({
  cube,
  active,
  playing,
  reduced,
  featured = false,
}: {
  cube: (typeof CUBES)[number];
  active: boolean;
  playing: boolean;
  reduced: boolean;
  featured?: boolean;
}) {
  const [ready, setReady] = useState(false);
  const moving = active && playing && !reduced;
  const live = active && !reduced && (cube.live === 'explore' || cube.live === 'simulate');
  return (
    <>
      {(!live || !ready) && (
        <Image
          fill
          unoptimized
          sizes="(max-width:760px) 32vw, 20vw"
          src={
            cube.live === 'mesh' && moving
              ? '/images/landing-science/em-cell-mesh.webp'
              : cube.image
          }
          alt=""
          data-dark-source={cube.image.startsWith('/images/scales/')}
          data-testid={
            cube.id === 'mesh' ? `${featured ? 'featured-' : ''}inspect-mesh` : undefined
          }
        />
      )}
      {live && (
        <span className={styles.live} data-ready={ready}>
          {cube.live === 'explore' ? (
            <ExploreBrain spinning={moving} onReady={() => setReady(true)} />
          ) : (
            <FlySimulation started={moving} onBuilt={() => setReady(true)} />
          )}
        </span>
      )}
    </>
  );
}

export function FeaturedCubeModel({
  group,
  playing,
  reduced,
}: {
  group: CubeGroup;
  playing: boolean;
  reduced: boolean;
}) {
  const cube = CUBES.find((item) => item.group === group);
  if (!cube) return null;
  return (
    <div className={styles.featured} role="img" aria-label={`${cube.label}, enlarged`}>
      <CubeModel key={cube.id} cube={cube} active playing={playing} reduced={reduced} featured />
    </div>
  );
}
