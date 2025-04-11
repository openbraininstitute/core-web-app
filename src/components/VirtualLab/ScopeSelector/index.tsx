import { useAtom } from 'jotai';
import capitalize from 'lodash/capitalize';
import Image from 'next/image';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { scopeSelectorExpandedAtom, selectedSimTypeFamily, selectedTabFamily } from './state';
import { classNames } from '@/util/utils';
import { SimulationType } from '@/types/virtual-lab/lab';
import { basePath } from '@/config';
import Styles from './styles.module.css';

export function SectionTabs({
  projectId,
  section,
}: {
  projectId: string;
  section: 'build' | 'simulate';
}) {
  const [selectedTab, setSelectedTab] = useAtom(selectedTabFamily(section + projectId));
  const label = section === 'build' ? 'model' : 'simulation';

  const tabJSX = (tab: typeof selectedTab) => {
    const isSelected = selectedTab === tab;
    return (
      <label
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
          onChange={() => setSelectedTab(tab)}
          type="radio"
        />
        {makeTitle(tab, label) + (tab === 'browse' ? 's' : '')}
      </label>
    );
  };

  return (
    <div className="divide-primary-3 border-primary-3 -mt-[67px] inline-flex min-h-[50px] w-[55%] divide-x border">
      {tabJSX('new')}
      {tabJSX('browse')}
    </div>
  );
}

/**
 * Capitalize `words` and add a space between them.
 * In the meantime, eerytime we find "simulation", we replace it with "experiment".
 */
function makeTitle(...words: string[]): string {
  return words.map((word) => capitalize(word.replace('simulation', 'experiment'))).join(' ');
}

export function ScopeSelector({
  atomKey,
  section,
  handleBuildClick,
}: {
  handleBuildClick?: () => void;
  section: 'build' | 'simulate';
  atomKey: string;
}) {
  const [selectedSimType, setSelectedSimType] = useAtom(selectedSimTypeFamily(atomKey));

  const tileJSX = (type: SimulationType, description: string, imgSrc: string, disabled = false) => {
    const title = capitalize(type.replace('-', ' '));
    const highlight = type === selectedSimType;

    const showImage = section !== 'build' || (section === 'build' && !highlight);

    const tileStyle = highlight ? 'bg-white text-primary-9' : 'bg-primary-9 text-white';
    const descStyle = highlight ? 'text-primary-8' : 'text-gray-100';

    return (
      <div
        aria-hidden
        className={classNames(
          'border-primary-4 box-border flex h-[200px] justify-between gap-5 overflow-hidden rounded-sm border p-6',
          tileStyle,
          !disabled && 'cursor-pointer'
        )}
        onClick={() => {
          if (!disabled) setSelectedSimType(type);
        }}
      >
        <div className="text-left">
          <div className="mb-2 text-3xl font-semibold">{title}</div>
          <div className={classNames('text-sm', descStyle)}>{description}</div>
        </div>

        {showImage && (
          <Image
            src={imgSrc}
            width={100}
            height={100}
            alt={title}
            className={classNames(Styles.imageCircle, 'self-center')}
          />
        )}

        {!showImage && (
          <button
            type="button"
            className="bg-primary-9 h-[55px] min-w-[100px] self-center text-xl font-bold text-white"
            onClick={handleBuildClick}
          >
            Build
          </button>
        )}
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
        {tileJSX(SimulationType.IonChannel, 'Coming soon.', imageUrl('ionChannel'), true)}
        {tileJSX(
          SimulationType.PairedNeuron,
          'Retrieve interconnected Hodgkin-Huxley cell models from a circuit and conduct a simulated experiment by establishing a stimulation and reporting protocol.',
          imageUrl('pairedNeuron'),
          true
        )}
        {tileJSX(SimulationType.BrainRegions, 'Coming soon.', imageUrl('brainRegion'), true)}
        {tileJSX(
          SimulationType.SingleNeuron,
          'Load Hodgkin-Huxley single cell models, perform current clamp experiments with different levels of input current, and observe the resulting changes in membrane potential.',
          imageUrl('singleNeuron')
        )}
        {tileJSX(SimulationType.Microcircuit, 'Coming soon.', imageUrl('microcircuit'), true)}
        {tileJSX(SimulationType.BrainSystems, 'Coming soon.', imageUrl('brainSystem'), true)}
        {tileJSX(
          SimulationType.Synaptome,
          'Introduce spikes into the synapses of Hodgkin-Huxley cell models and carry out a virtual experiment by setting up a stimulation and reporting protocol.',
          imageUrl('synaptome')
        )}
        {tileJSX(SimulationType.NeuroGliaVasculature, 'Coming soon.', imageUrl('ngv'), true)}
        {tileJSX(SimulationType.WholeBrain, 'Coming soon.', imageUrl('wholeBrain'), true)}
      </div>
    </div>
  );
}

export function ScopeSelectorSmall({ atomKey }: { atomKey: string }) {
  const [expanded, setExpanded] = useAtom(scopeSelectorExpandedAtom(atomKey));
  let [selectedSimType, setSelectedSimType] = useAtom(selectedSimTypeFamily(atomKey)); // eslint-disable-line prefer-const
  selectedSimType = selectedSimType ?? SimulationType.SingleNeuron;

  const header = (label: string) => <div className="font-semibold text-gray-400">{label}</div>;

  const tile = (type: SimulationType) => (
    <button
      disabled={selectedSimType === type}
      type="button"
      key={type}
      onClick={() => {
        setExpanded(false);
        setSelectedSimType(type);
      }}
      className={classNames(
        'flex h-[40px] items-center border pl-5 font-semibold',
        selectedSimType === type
          ? 'bg-primary-8 border-none text-white'
          : 'text-primary-9 border-gray-300'
      )}
    >
      {capitalize(type.replace('-', ' '))}
    </button>
  );

  const iconClass = 'relative top-[9px] float-right text-base text-primary-9';

  return (
    <>
      <button
        type="button"
        className="w-1/2 bg-white px-10 py-4 text-left text-2xl"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={classNames('text-gray-400', expanded && 'opacity-40')}>Scale</span>
        <span className={classNames('text-primary-9 ml-3 font-bold', expanded && 'opacity-40')}>
          {capitalize(selectedSimType.replace('-', ' '))}
        </span>

        {!expanded && <DownOutlined className={iconClass} />}
        {expanded && <UpOutlined className={iconClass} />}
      </button>

      {expanded && (
        <div className="grid grid-cols-3 gap-5 bg-white px-8 py-6">
          {header('CELLULAR')}
          {header('CIRCUIT')}
          {header('SYSTEM')}
          {Object.values(SimulationType).map((v) => tile(v))}
        </div>
      )}
    </>
  );
}

function imageUrl(img: string) {
  return `${basePath}/images/scales/` + img + '.jpg';
}
