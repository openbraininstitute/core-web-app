'use client';

import { useSetAtom } from 'jotai';
import { parseAsString, Parser, useQueryStates } from 'nuqs';
import { DownOutlined } from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import capitalize from 'lodash/capitalize';
import Image from 'next/image';
import map from 'lodash/map';
import { motion, AnimatePresence } from 'framer-motion';
import { useRef } from 'react';
import { Button } from 'antd';

import { classNames } from '@/util/utils';
import { basePath } from '@/config';
import {
  TEntityCoreConfigurationItem,
  EntityCoreConfiguration,
} from '@/entity-configuration/domain';
import useOnClickOutside from '@/hooks/useOnClickOutside';
import { selectedSimulationScopeAtom } from '@/state/simulate';
import { SimulationType } from '@/types/virtual-lab/lab';

export enum ModelTileType {
  IonChannel = 'ion-channel',
  TinyCircuit = 'small-microcircuit',
  BrainRegions = 'brain-regions',
  SingleNeuron = 'single-neuron',
  Microcircuit = 'microcircuit',
  BrainSystems = 'brain-systems',
  Synaptome = 'synaptome',
  NeuroGliaVasculature = 'neuro-glia-vasculature',
  WholeBrain = 'whole-brain',
}
type SectionTypeValue = `${ModelTileType}`;

export const useTileScopeQuery = () => {
  const pathname = usePathname();
  const segments = pathname.split('/');
  const sectionName = segments.pop() || segments.pop(); // Handles potential trailing slash
  const section = sectionName as 'build' | 'simulate';
  const [{ selectedTab, type }, updateScopeConfig] = useQueryStates(
    {
      selectedTab: parseAsString
        .withDefault('new')
        .withOptions({ clearOnDefault: false }) as Parser<'new' | 'browse'>,
      type: parseAsString
        .withDefault(ModelTileType.SingleNeuron)
        .withOptions({ clearOnDefault: false }) as Parser<SectionTypeValue>,
    },
    {
      urlKeys: {
        selectedTab: 's',
        type: 't',
      },
      shallow: false,
      clearOnDefault: false,
    }
  );

  return {
    type,
    section,
    updateScopeConfig,
    selectedTab: selectedTab ?? undefined,
  };
};

/**
 * Capitalize `words` and add a space between them.
 * In the meantime, every time we find "simulation", we replace it with "experiment".
 */
function makeTitle(...words: string[]): string {
  return words.map((word) => capitalize(word.replace('simulation', 'experiment'))).join(' ');
}

function imageUrl(img: string) {
  return `${basePath}/images/scales/` + img + '.jpg';
}
const header = (label: string) => <div className="font-semibold text-gray-400">{label}</div>;

type TTileConfig = {
  id: string;
  title: string;
  type: ModelTileType;
  description: string;
  img: string;
  disabled: boolean;
  entities?: {
    build?: TEntityCoreConfigurationItem;
    simulate?: TEntityCoreConfigurationItem;
  };
  url: {
    build?: string;
    explore?: string;
  } | null;
};

export const ModelTilesConfig: Array<TTileConfig> = [
  {
    id: 'ion-channel',
    title: 'Ion Channel',
    type: ModelTileType.IonChannel,
    description: 'Coming soon.',
    img: imageUrl('ionChannel'),
    disabled: true,
    url: null,
  },
  {
    id: 'small-microcircuit',
    title: 'Small Microcircuit',
    type: ModelTileType.TinyCircuit,
    description:
      'Design and run virtual experiments using circuits with 3-20 Hodgkin-Huxley cell models. These small microcircuits are often extracted from larger circuit models.',
    img: imageUrl('pairedNeuron'),
    disabled: false,
    url: null,
    entities: {
      build: EntityCoreConfiguration.Circuit,
    },
  },
  {
    id: 'brain-regions',
    title: 'Brain Regions',
    type: ModelTileType.BrainRegions,
    description: 'Coming soon.',
    img: imageUrl('brainRegion'),
    disabled: true,
    url: null,
  },
  {
    id: 'single-neuron',
    title: 'Single Neuron',
    type: ModelTileType.SingleNeuron,
    description:
      'Load Hodgkin-Huxley single cell models, perform current clamp experiments with different levels of input current, and observe the resulting changes in membrane potential.',
    img: imageUrl('singleNeuron'),
    disabled: false,
    url: {
      build: 'build/me-model/new',
      explore: 'explore/interactive/model/me-model',
    },
    entities: {
      build: EntityCoreConfiguration.MEmodel,
      simulate: EntityCoreConfiguration.SingleNeuronSimulation,
    },
  },
  {
    id: 'microcircuit',
    title: 'Microcircuit',
    type: ModelTileType.Microcircuit,
    description: 'Coming soon.',
    img: imageUrl('microcircuit'),
    disabled: true,
    url: null,
  },
  {
    id: 'brain-systems',
    title: 'Brain Systems',
    type: ModelTileType.BrainSystems,
    description: 'Coming soon.',
    img: imageUrl('brainSystem'),
    disabled: true,
    url: null,
  },
  {
    id: 'synaptome',
    title: 'Synaptome',
    type: ModelTileType.Synaptome,
    description:
      'Introduce spikes into the synapses of Hodgkin-Huxley cell models and carry out a virtual experiment by setting up a stimulation and reporting protocol.',
    img: imageUrl('synaptome'),
    disabled: false,
    url: {
      build: 'build/synaptome/new',
      explore: 'explore/interactive/model/synaptome',
    },
    entities: {
      build: EntityCoreConfiguration.SingleNeuronSynaptome,
      simulate: EntityCoreConfiguration.SingleNeuronSynaptomeSimulation,
    },
  },
  {
    id: 'neuro-glia-vasculature',
    title: 'Neuro Glia Vasculature',
    type: ModelTileType.NeuroGliaVasculature,
    description: 'Coming soon.',
    img: imageUrl('ngv'),
    disabled: true,
    url: null,
  },
  {
    id: 'whole-brain',
    title: 'Whole Brain',
    type: ModelTileType.WholeBrain,
    description: 'Coming soon.',
    img: imageUrl('wholeBrain'),
    disabled: true,
    url: null,
  },
];

export function SectionTabs() {
  const { selectedTab, section, type, updateScopeConfig } = useTileScopeQuery();
  const label = section === 'build' ? 'model' : 'simulation';

  const tabJSX = (tab: typeof selectedTab) => {
    const isSelected = selectedTab === tab;
    return (
      <label
        key={`tab-${section}/${tab}`}
        className={classNames(
          'hover:bg-primary-8 flex grow cursor-pointer items-center justify-center text-xl font-bold transition-all hover:text-white',
          isSelected && 'text-primary-9 bg-white'
        )}
        htmlFor={`scope-filter-${tab}`}
      >
        <input
          aria-label={tab}
          checked={isSelected}
          className="sr-only"
          id={`scope-filter-${tab}`}
          onChange={() => {
            updateScopeConfig({ selectedTab: tab!, type });
          }}
          type="radio"
        />
        {makeTitle(tab!, label) + (tab === 'browse' ? 's' : '')}
      </label>
    );
  };

  return (
    <div className="divide-primary-3 border-primary-3 inline-flex min-h-[50px] w-[55%] divide-x border">
      {tabJSX('new')}
      {tabJSX('browse')}
    </div>
  );
}

export function ScopeSelector() {
  const { push: navigate } = useRouter();
  const setScope = useSetAtom(selectedSimulationScopeAtom);
  const { selectedTab, section, type: modelType, updateScopeConfig } = useTileScopeQuery();
  const tileJSX = ({ id, title, type, description, disabled, img, url }: TTileConfig) => {
    const highlight = type === modelType;
    const showImage = section !== 'build' || (section === 'build' && !highlight);
    const tileStyle = highlight ? 'bg-white text-primary-9' : 'bg-primary-9 text-white';
    const descStyle = highlight ? 'text-primary-8' : 'text-gray-100';

    if (id === 'small-microcircuit' && section === 'build') {
      // eslint-disable-next-line
      disabled = true;
    }

    // eslint-disable-next-line
    if (disabled) description = 'Coming soon';

    const onClick = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
      e.preventDefault();
      e.stopPropagation();
      if (url?.build) navigate(url.build);
    };

    return (
      <div
        id={id}
        key={`tile-${section}/${selectedTab}/${type}`}
        aria-hidden
        className={classNames(
          'border-primary-4 box-border flex h-[200px] items-start justify-between gap-5 overflow-hidden rounded-sm border p-6',
          tileStyle,
          !disabled && 'cursor-pointer'
        )}
        onClick={() => {
          if (!disabled) {
            setScope(type as unknown as SimulationType);
            updateScopeConfig({ selectedTab, type });
          }
        }}
      >
        <div className="w-2/3 text-left">
          <div className="mb-2 text-3xl font-semibold">{title}</div>
          <div className={classNames('text-sm text-balance', descStyle)}>{description}</div>
        </div>
        <div className="flex h-full w-1/3 flex-col items-center justify-center gap-3">
          {showImage && (
            <motion.div
              className="flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Image
                src={img}
                width={100}
                height={100}
                alt={title}
                style={{
                  clipPath: 'circle()',
                  shapeOutside: 'circle()',
                  height: 'auto',
                  width: 'auto',
                }}
              />
            </motion.div>
          )}
          {url?.build ? (
            <motion.div
              className="flex items-center justify-center"
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                onClick={onClick}
                className={classNames(
                  'bg-primary-9 h-[55px] min-w-[100px] text-xl font-bold text-white',
                  'items-center justify-center rounded-none hover:text-white',
                  highlight && section === 'build' ? 'flex' : 'hidden'
                )}
              >
                Build
              </Button>
            </motion.div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="text-primary-4 mt-12 text-[40px] font-bold">
        {section === 'build' && 'Select a scale for your model'}
        {section === 'simulate' && 'Select a scale to choose models and experiments'}
      </div>

      <div className="mt-8 mb-5 grid grid-cols-3 gap-5">
        <div className="text-primary-4 text-4xl">CELLULAR</div>
        <div className="text-primary-4 text-4xl">CIRCUIT</div>
        <div className="text-primary-4 text-4xl">SYSTEM</div>
        {map(ModelTilesConfig, tileJSX)}
      </div>
    </div>
  );
}

export function ScopeSelectorSmall({
  expanded,
  onMenuExpand,
}: {
  expanded: boolean;
  onMenuExpand: (value: boolean) => void;
}) {
  const { section, selectedTab, type, updateScopeConfig } = useTileScopeQuery();
  const ref = useRef<HTMLDivElement>(null);

  const tile = (config: TTileConfig) => {
    return (
      <button
        disabled={type === config.type || config.disabled}
        type="button"
        key={`menu-${section}/${selectedTab}/${config.id}`}
        onClick={() => {
          onMenuExpand(false);
          updateScopeConfig({ selectedTab, type: config.type });
        }}
        className={classNames(
          'hover:bg-neutral-1/40 flex h-[40px] items-center border pl-5 font-semibold',
          config.type === type
            ? 'bg-primary-8 border-none text-white'
            : 'text-primary-9 border-gray-300'
        )}
      >
        {capitalize(config.title)}
      </button>
    );
  };

  useOnClickOutside(
    ref,
    () => onMenuExpand(false),
    ['mousedown', 'touchstart'],
    (event) => {
      return event.target.closest('#expand-button');
    }
  );

  return (
    <div className="relative">
      <button
        id="expand-button"
        type="button"
        className="w-1/2 bg-white px-10 py-4 text-left text-2xl"
        onClick={() => onMenuExpand(!expanded)}
      >
        <span className={classNames('text-gray-400', expanded && 'opacity-40')}>Scale</span>
        <span className={classNames('text-primary-9 ml-3 font-bold', expanded && 'opacity-40')}>
          {capitalize(ModelTilesConfig.find((o) => o.type === type)?.title)}
        </span>
        <DownOutlined
          className={classNames(
            'text-primary-9 relative top-[9px] float-right text-base transition-transform duration-300 ease-in-out',
            expanded && '-rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            ref={ref}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={{
              hidden: { opacity: 0, y: -10 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeInOut' } },
              exit: { opacity: 0, y: -10, transition: { duration: 0.15, ease: 'easeIn' } },
            }}
            className="absolute left-0 z-10 grid w-full grid-cols-3 gap-5 bg-white px-8 py-6 shadow-lg"
          >
            {header('CELLULAR')}
            {header('CIRCUIT')}
            {header('SYSTEM')}
            {map(ModelTilesConfig, tile)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
