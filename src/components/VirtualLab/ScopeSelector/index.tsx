import { useAtom } from 'jotai';
import capitalize from 'lodash/capitalize';
import Image from 'next/image';
import { selectedNewSimTypeFamily, selectedTabFamily } from './state';
import { classNames } from '@/util/utils';
import { SimulationType } from '@/types/virtual-lab/lab';
import Styles from './styles.module.css';

export function SectionTabs({ projectId, label }: { projectId: string; label: string }) {
  const [selectedTab, setSelectedTab] = useAtom(selectedTabFamily('build' + projectId));

  const tabJSX = (tab: typeof selectedTab) => {
    const isSelected = selectedTab === tab;
    return (
      <label
        className={classNames(
          'flex grow cursor-pointer items-center justify-center text-2xl font-bold transition-all hover:bg-primary-8 hover:text-white',
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
    <div className="-mt-[67px] inline-flex min-h-[50px] w-[65%] divide-x divide-primary-3 border border-primary-3">
      {tabJSX('new')}
      {tabJSX('browse')}
    </div>
  );
}

export function ScopeSelector({ projectId }: { projectId: string }) {
  const [selectedSimType, setSelectedSimType] = useAtom(
    selectedNewSimTypeFamily('build' + projectId)
  );

  console.log(selectedSimType);
  const tileJSX = (type: SimulationType, description: string, imgSrc: string, disabled = false) => {
    const title = capitalize(type.replace('-', ' '));
    return (
      <button
        disabled={disabled}
        type="button"
        className="flex justify-between gap-3  rounded border border-primary-4 bg-primary-9 p-5 text-white"
        onClick={() => setSelectedSimType(type)}
      >
        <div className="text-left">
          <div className="mb-2 text-3xl">{title}</div>
          <div className="text-sm text-gray-100">{description}</div>
        </div>
        <Image
          src={imgSrc}
          width={100}
          height={100}
          alt={title}
          className={classNames(Styles.imageCircle, 'self-center')}
        />
      </button>
    );
  };
  return (
    <div>
      <div className="mt-12 text-[40px] font-bold text-primary-4">
        Select a scale for your model
      </div>

      <div className="mt-8 grid grid-cols-3 gap-5">
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

function imageUrl(img: string) {
  return '/images/scales/' + img + '.jpg';
}
