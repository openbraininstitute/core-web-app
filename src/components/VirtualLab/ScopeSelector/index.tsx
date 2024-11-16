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
          'flex grow cursor-pointer items-center justify-center text-xl font-bold transition-all hover:bg-primary-8 hover:text-white',
          isSelected && 'bg-white text-primary-9'
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
        {capitalize(`${tab} ${label}`) + (tab === 'browse' ? 's' : '')}
      </label>
    );
  };

  return (
    <div className="-mt-[67px] inline-flex min-h-[50px] w-[55%] divide-x divide-primary-3 border border-primary-3">
      {tabJSX('new')}
      {tabJSX('browse')}
    </div>
  );
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
          'box-border flex h-[200px] justify-between gap-5 overflow-hidden rounded border border-primary-4 p-6',
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
            className="h-[55px] min-w-[100px] self-center  bg-primary-9 text-xl font-bold text-white"
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
      <div className="mt-12 text-[40px] font-bold text-primary-4">
        Select a scale for your {section === 'build' ? 'model' : 'simulation'}
      </div>

      <div className="mb-5 mt-8 grid grid-cols-3 gap-5">
        <div className="text-4xl text-primary-4">CELLULAR</div>
        <div className="text-4xl text-primary-4">CIRCUIT</div>
        <div className="text-4xl text-primary-4">SYSTEM</div>
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
          ? 'border-none bg-primary-8 text-white'
          : 'border-gray-300 text-primary-9'
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
        className="w-1/2 bg-white px-10  py-4 text-left text-2xl"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={classNames('text-gray-400', expanded && 'opacity-40')}>Scale</span>
        <span className={classNames('ml-3 font-bold text-primary-9', expanded && 'opacity-40')}>
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
