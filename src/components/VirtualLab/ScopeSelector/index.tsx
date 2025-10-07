'use client';

import { useSetAtom } from 'jotai';
import { parseAsString, Parser, useQueryStates } from 'nuqs';
import { DownOutlined } from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useRef } from 'react';
import { Button } from 'antd';
import capitalize from 'es-toolkit/compat/capitalize';
import map from 'es-toolkit/compat/map';
import Image from 'next/image';

import { ModelTilesConfig, ModelTileType, SectionTypeValue, TTileConfig } from './tiles';

import { classNames } from '@/util/utils';
import useOnClickOutside from '@/hooks/useOnClickOutside';
import { selectedSimulationScopeAtom } from '@/state/simulate';
import { SimulationType } from '@/types/virtual-lab/lab';

import styles from './index.module.css';

export { ModelTilesConfig } from './tiles';

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

const header = (label: string) => <div className="font-semibold text-gray-400">{label}</div>;

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

  const tileJSX = ({ id, title, type: tileType, description, disabled, img, url }: TTileConfig) => {
    const highlight = tileType === modelType;

    const showImage = section !== 'build' || (section === 'build' && !highlight);
    const tileStyle = highlight ? 'bg-white text-primary-9' : 'bg-primary-9 text-white';
    const descStyle = highlight ? 'text-primary-8' : 'text-gray-100';

    if (
      (tileType === 'small-microcircuit' || tileType === 'paired-neurons') &&
      section === 'build'
    ) {
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
        key={`tile-${section}/${selectedTab}/${tileType}`}
        aria-hidden
        className={classNames(
          styles.tabCell,
          'border-primary-4 box-border flex items-start justify-between gap-5 overflow-hidden rounded-sm border p-6',
          tileStyle,
          !disabled && 'cursor-pointer'
        )}
        onClick={() => {
          if (!disabled) {
            setScope(tileType as unknown as SimulationType);
            updateScopeConfig({ selectedTab, type: tileType });
          }
        }}
      >
        <div className="w-full text-left">
          <div className={styles.title}>{title}</div>
          <div className={classNames('text-sm text-balance', descStyle, styles.floatContainer)}>
            <div>
              {showImage && (
                <div className={styles.thumbnail}>
                  <Image src={img} width={100} height={100} alt={title} />
                </div>
              )}
              {url?.build && (
                <div
                  className={classNames(
                    styles.buildButtonContainer,
                    highlight && section === 'build' ? styles.show : styles.hide
                  )}
                >
                  <Button
                    onClick={onClick}
                    className={classNames(
                      styles.buildButton,
                      'bg-primary-9',
                      'rounded-none hover:text-white'
                    )}
                  >
                    Build
                  </Button>
                </div>
              )}
              <p>{description}</p>
            </div>
          </div>
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

      <div className="mt-8 mb-5 grid grid-cols-4 gap-5">
        <div className="text-primary-4 text-4xl">SUBCELLULAR</div>
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
    const disabled =
      (config.type === 'small-microcircuit' || config.type === 'paired-neurons') &&
      section === 'build';

    return (
      <button
        disabled={type === config.type || config.disabled || disabled}
        type="button"
        key={`menu-${section}/${selectedTab}/${config.id}`}
        onClick={() => {
          onMenuExpand(false);
          updateScopeConfig({ selectedTab, type: config.type });
        }}
        className={classNames(
          'hover:bg-neutral-1/40 flex h-[40px] items-center border pl-5 font-semibold',
          'disabled:pointer-events-none disabled:cursor-not-allowed',
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
          {capitalize(ModelTilesConfig.find((o) => o.type === type)?.title ?? '')}
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
            className="absolute left-0 z-10 grid w-full grid-cols-4 gap-5 bg-white px-8 py-6 shadow-lg"
          >
            {header('SUBCELLULAR')}
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
