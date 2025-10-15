'use client';

import { useState } from 'react';

// The _searchParams prop was unused, so I removed it to simplify the component signature.
export default function GuidesSection() {
  // 1. Separate state variables for each section to allow independent toggling
  const [isSection1Open, setIsSection1Open] = useState(false); // Batch upload morphologies
  const [isSection2Open, setIsSection2Open] = useState(false); // Upload data
  const [isSection3Open, setIsSection3Open] = useState(false); // Browse data
  const [isSection4Open, setIsSection4Open] = useState(false); // Build a single neuron
  const [isSection5Open, setIsSection5Open] = useState(false); // Build a synaptome
  const [isSection6Open, setIsSection6Open] = useState(false); // Simulate single neuron
  const [isSection7Open, setIsSection7Open] = useState(false); // Simulate a synaptome
  const [isSection8Open, setIsSection8Open] = useState(false); // Simulate paired neurons
  const [isSection9Open, setIsSection9Open] = useState(false); // Simulate microcircuit

  // Helper function to create a click handler for any given setter
  const createToggleHandler = (setter: React.Dispatch<React.SetStateAction<boolean>>) => () => {
    setter((prev) => !prev);
  };

  // Helper function to create a key down handler for accessibility (Enter/Space)
  const createKeyDownHandler =
    (setter: React.Dispatch<React.SetStateAction<boolean>>) => (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setter((prev) => !prev);
      }
    };

  // Define shared styles and content indicators
  const buttonStyle = { textDecoration: 'underline', cursor: 'pointer' };
  const getButtonText = (isOpen: boolean) => (isOpen ? '▼ ' : '▶ '); // Simple visual indicator

  // Create handlers for clarity
  const handleToggle1 = createToggleHandler(setIsSection1Open);
  const handleToggle2 = createToggleHandler(setIsSection2Open);
  const handleToggle3 = createToggleHandler(setIsSection3Open);
  const handleToggle4 = createToggleHandler(setIsSection4Open);
  const handleToggle5 = createToggleHandler(setIsSection5Open);
  const handleToggle6 = createToggleHandler(setIsSection6Open);
  const handleToggle7 = createToggleHandler(setIsSection7Open);
  const handleToggle8 = createToggleHandler(setIsSection8Open);
  const handleToggle9 = createToggleHandler(setIsSection9Open);

  const handleKeyDown1 = createKeyDownHandler(setIsSection1Open);
  const handleKeyDown2 = createKeyDownHandler(setIsSection2Open);
  const handleKeyDown3 = createKeyDownHandler(setIsSection3Open);
  const handleKeyDown4 = createKeyDownHandler(setIsSection4Open);
  const handleKeyDown5 = createKeyDownHandler(setIsSection5Open);
  const handleKeyDown6 = createKeyDownHandler(setIsSection6Open);
  const handleKeyDown7 = createKeyDownHandler(setIsSection7Open);
  const handleKeyDown8 = createKeyDownHandler(setIsSection8Open);
  const handleKeyDown9 = createKeyDownHandler(setIsSection9Open);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <p className="mb-4 text-lg font-medium text-gray-700">
        This is the guides section. Topics include:
      </p>

      {/* Section 1: How to batch upload morphologies. */}
      <div className="border-b border-gray-200 pb-2">
        <button
          type="button"
          className="w-full text-left font-semibold text-blue-500 hover:text-blue-700 focus:outline-none"
          style={buttonStyle}
          onClick={handleToggle1}
          onKeyDown={handleKeyDown1}
          aria-expanded={isSection1Open}
          aria-controls="content-1"
        >
          {getButtonText(isSection1Open)} How to batch upload morphologies.
        </button>
        {isSection1Open && (
          <p
            id="content-1"
            className="mt-2 ml-5 rounded-lg bg-blue-50 p-3 text-gray-700 transition-all duration-300"
          >
            To upload multiple morphologies, download this{' '}
            <a
              href="/guides/batch_register_morphologies.ipynb"
              download="batch_register_morphologies.ipynb"
              className="font-bold text-blue-700 underline hover:text-blue-900"
            >
              script
            </a>{' '}
            and, after modifying it, run it on your local machine.
          </p>
        )}
      </div>

      {/* Section 2: How to upload data. */}
      <div className="border-b border-gray-200 pb-2">
        <button
          type="button"
          className="w-full text-left font-semibold text-blue-500 hover:text-blue-700 focus:outline-none"
          style={buttonStyle}
          onClick={handleToggle2}
          onKeyDown={handleKeyDown2}
          aria-expanded={isSection2Open}
          aria-controls="content-2"
        >
          {getButtonText(isSection2Open)} How to upload data.
        </button>
        {isSection2Open && (
          <p
            id="content-2"
            className="mt-2 ml-5 rounded-lg bg-blue-50 p-3 text-gray-700 transition-all duration-300"
          >
            In the data section click on upload data button and select the type. Then complete the
            workflow that pops up.
          </p>
        )}
      </div>

      {/* Section 3: How to browse data. */}
      <div className="border-b border-gray-200 pb-2">
        <button
          type="button"
          className="w-full text-left font-semibold text-blue-500 hover:text-blue-700 focus:outline-none"
          style={buttonStyle}
          onClick={handleToggle3}
          onKeyDown={handleKeyDown3}
          aria-expanded={isSection3Open}
          aria-controls="content-3"
        >
          {getButtonText(isSection3Open)} How to browse data.
        </button>
        {isSection3Open && (
          <p
            id="content-3"
            className="mt-2 ml-5 rounded-lg bg-blue-50 p-3 text-gray-700 transition-all duration-300"
          >
            In the data section click on the left hand side choose the brain region. Then select
            experimental, model, or simulation data. The entities appear below and can be clicked on
            to see the full list.
          </p>
        )}
      </div>

      {/* Section 4: How to build a single neuron. */}
      <div className="border-b border-gray-200 pb-2">
        <button
          type="button"
          className="w-full text-left font-semibold text-blue-500 hover:text-blue-700 focus:outline-none"
          style={buttonStyle}
          onClick={handleToggle4}
          onKeyDown={handleKeyDown4}
          aria-expanded={isSection4Open}
          aria-controls="content-4"
        >
          {getButtonText(isSection4Open)} How to build a single neuron.
        </button>
        {isSection4Open && (
          <p
            id="content-4"
            className="mt-2 ml-5 rounded-lg bg-blue-50 p-3 text-gray-700 transition-all duration-300"
          >
            In the workflows section click on the build button and choose single neuron. You will
            then be prompted to select an m-model and an e-model.
          </p>
        )}
      </div>

      {/* Section 5: How to build a synaptome. */}
      <div className="border-b border-gray-200 pb-2">
        <button
          type="button"
          className="w-full text-left font-semibold text-blue-500 hover:text-blue-700 focus:outline-none"
          style={buttonStyle}
          onClick={handleToggle5}
          onKeyDown={handleKeyDown5}
          aria-expanded={isSection5Open}
          aria-controls="content-5"
        >
          {getButtonText(isSection5Open)} How to build a synaptome.
        </button>
        {isSection5Open && (
          <p
            id="content-5"
            className="mt-2 ml-5 rounded-lg bg-blue-50 p-3 text-gray-700 transition-all duration-300"
          >
            In the workflows section click on the build button and choose synaptome build. You will
            then be prompted to select an me-model and synapse sets.
          </p>
        )}
      </div>

      {/* Section 6: How to simulate a single neuron. */}
      <div className="border-b border-gray-200 pb-2">
        <button
          type="button"
          className="w-full text-left font-semibold text-blue-500 hover:text-blue-700 focus:outline-none"
          style={buttonStyle}
          onClick={handleToggle6}
          onKeyDown={handleKeyDown6}
          aria-expanded={isSection6Open}
          aria-controls="content-6"
        >
          {getButtonText(isSection6Open)} How to simulate a single neuron.
        </button>
        {isSection6Open && (
          <p
            id="content-6"
            className="mt-2 ml-5 rounded-lg bg-blue-50 p-3 text-gray-700 transition-all duration-300"
          >
            In the simulate section click single neuron simulation. You will then choose a built
            model. Setup the experiment, stimulation, and recording. The morphology is visible on
            the right. Then run the experiment.
          </p>
        )}
      </div>

      {/* Section 7: How to simulate a synaptome. (Corrected title) */}
      <div className="border-b border-gray-200 pb-2">
        <button
          type="button"
          className="w-full text-left font-semibold text-blue-500 hover:text-blue-700 focus:outline-none"
          style={buttonStyle}
          onClick={handleToggle7}
          onKeyDown={handleKeyDown7}
          aria-expanded={isSection7Open}
          aria-controls="content-7"
        >
          {getButtonText(isSection7Open)} How to simulate a synaptome.
        </button>
        {isSection7Open && (
          <p
            id="content-7"
            className="mt-2 ml-5 rounded-lg bg-blue-50 p-3 text-gray-700 transition-all duration-300"
          >
            In the simulate section click synaptome simulation. You will then choose a built model.
            Setup the experiment, synaptic input, stimulation, and recording. The morphology is
            visible on the right. Then run the experiment.
          </p>
        )}
      </div>

      {/* Section 8: How to simulate paired neurons. (Corrected title) */}
      <div className="border-b border-gray-200 pb-2">
        <button
          type="button"
          className="w-full text-left font-semibold text-blue-500 hover:text-blue-700 focus:outline-none"
          style={buttonStyle}
          onClick={handleToggle8}
          onKeyDown={handleKeyDown8}
          aria-expanded={isSection8Open}
          aria-controls="content-8"
        >
          {getButtonText(isSection8Open)} How to simulate paired neurons.
        </button>
        {isSection8Open && (
          <p
            id="content-8"
            className="mt-2 ml-5 rounded-lg bg-blue-50 p-3 text-gray-700 transition-all duration-300"
          >
            In the simulate section click paired neuron simulation. You will then choose a built
            model. Complete the setup, stimuli, circuit, and events sections. The morphologies are
            visible on the right. Then run the experiment.
          </p>
        )}
      </div>

      {/* Section 9: How to simulate a small microcircuit. */}
      <div className="pb-2">
        <button
          type="button"
          className="w-full text-left font-semibold text-blue-500 hover:text-blue-700 focus:outline-none"
          style={buttonStyle}
          onClick={handleToggle9}
          onKeyDown={handleKeyDown9}
          aria-expanded={isSection9Open}
          aria-controls="content-9"
        >
          {getButtonText(isSection9Open)} How to simulate a small microcircuit.
        </button>
        {isSection9Open && (
          <p
            id="content-9"
            className="mt-2 ml-5 rounded-lg bg-blue-50 p-3 text-gray-700 transition-all duration-300"
          >
            In the simulate section click small microcircuit simulation. You will then choose a
            built model. Complete the setup, stimuli, circuit, and events sections. The morphologies
            are visible on the right. Then generate the simulation.
          </p>
        )}
      </div>
    </div>
  );
}
