'use client';

import { useState } from 'react';

// The _searchParams prop was unused, so I removed it to simplify the component signature.
export default function GuidesSection() {
  // 1. Separate state variables for each section to allow independent toggling
  const [isSection1Open, setIsSection1Open] = useState(false); // Batch upload morphologies
  const [isSection2Open, setIsSection2Open] = useState(false); // Upload data
  const [isSection3Open, setIsSection3Open] = useState(false); // Browse data
  const [isSection4Open, setIsSection4Open] = useState(false); // Build a single neuron

  // Helper function to create a click handler for any given setter
  const createToggleHandler = (setter: React.Dispatch<React.SetStateAction<boolean>>) => () => {
    setter((prev) => !prev);
  };

  // Helper function to create a key down handler for accessibility (Enter/Space)
  const createKeyDownHandler = (setter: React.Dispatch<React.SetStateAction<boolean>>) => (event: React.KeyboardEvent) => {
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

  const handleKeyDown1 = createKeyDownHandler(setIsSection1Open);
  const handleKeyDown2 = createKeyDownHandler(setIsSection2Open);
  const handleKeyDown3 = createKeyDownHandler(setIsSection3Open);
  const handleKeyDown4 = createKeyDownHandler(setIsSection4Open);


  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <p className="mb-4 text-lg font-medium text-gray-700">This is the guides section. Topics include:</p>

      {/* Section 1: How to batch upload morphologies. */}
      <div className="border-b border-gray-200 pb-2">
        <button
          type="button"
          className="text-left w-full font-semibold text-blue-500 hover:text-blue-700 focus:outline-none"
          style={buttonStyle}
          onClick={handleToggle1}
          onKeyDown={handleKeyDown1}
          aria-expanded={isSection1Open}
          aria-controls="content-1"
        >
          {getButtonText(isSection1Open)} How to batch upload morphologies.
        </button>
        {isSection1Open && (
          <p id="content-1" className="ml-5 mt-2 p-3 bg-blue-50 text-gray-700 rounded-lg transition-all duration-300">
            To upload multiple morphologies, download this{' '}
            <a
              href="/guides/batch_register_morphologies.ipynb"
              download="batch_register_morphologies.ipynb"
              className="font-bold text-blue-700 hover:text-blue-900 underline"
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
          className="text-left w-full font-semibold text-blue-500 hover:text-blue-700 focus:outline-none"
          style={buttonStyle}
          onClick={handleToggle2}
          onKeyDown={handleKeyDown2}
          aria-expanded={isSection2Open}
          aria-controls="content-2"
        >
          {getButtonText(isSection2Open)} How to upload data.
        </button>
        {isSection2Open && (
          <p id="content-2" className="ml-5 mt-2 p-3 bg-blue-50 text-gray-700 rounded-lg transition-all duration-300">
            In the data section click on upload data button and select the type. Then complete the workflow that pops up.
          </p>
        )}
      </div>

      {/* Section 3: How to browse data. */}
      <div className="border-b border-gray-200 pb-2">
        <button
          type="button"
          className="text-left w-full font-semibold text-blue-500 hover:text-blue-700 focus:outline-none"
          style={buttonStyle}
          onClick={handleToggle3}
          onKeyDown={handleKeyDown3}
          aria-expanded={isSection3Open}
          aria-controls="content-3"
        >
          {getButtonText(isSection3Open)} How to browse data.
        </button>
        {isSection3Open && (
          <p id="content-3" className="ml-5 mt-2 p-3 bg-blue-50 text-gray-700 rounded-lg transition-all duration-300">
            In the data section click on the left hand side choose the brain region. Then select experimental, model, or simulation data. The entities appear below and can be clicked on to see the full list.
          </p>
        )}
      </div>

      {/* Section 4: How to build a single neuron. */}
      <div className="pb-2">
        <button
          type="button"
          className="text-left w-full font-semibold text-blue-500 hover:text-blue-700 focus:outline-none"
          style={buttonStyle}
          onClick={handleToggle4}
          onKeyDown={handleKeyDown4}
          aria-expanded={isSection4Open}
          aria-controls="content-4"
        >
          {getButtonText(isSection4Open)} How to build a single neuron.
        </button>
        {isSection4Open && (
          <p id="content-4" className="ml-5 mt-2 p-3 bg-blue-50 text-gray-700 rounded-lg transition-all duration-300">
            In the workflows section click on the build button and choose single neuron. You will then be prompted to select an m-model and an e-model.
          </p>
        )}
      </div>
    </div>
  );
}
