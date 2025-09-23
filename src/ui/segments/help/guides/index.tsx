'use client';

import { useState } from 'react';

export default function GuidesSection({
  _searchParams,
}: {
  _searchParams?: Record<string, string | string[] | undefined>;
}) {
  const [isSection1Open, setIsSection1Open] = useState(false);

  const handleToggle = () => setIsSection1Open(!isSection1Open);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsSection1Open(!isSection1Open);
    }
  };

  return (
    <div>
      <p>This is the guides section. Topics include:</p>
      <br />
      <button
        type="button"
        style={{ textDecoration: 'underline', cursor: 'pointer' }}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
      >
        How to batch upload morphologies.
      </button>
      {isSection1Open && (
        <p>
          To upload multiple morphologies, download this{' '}
          <a
            href="/guides/batch_register_morphologies.ipynb"
            download="batch_register_morphologies.ipynb"
          >
            script
          </a>{' '}
          and, after modifying it, run it on your local machine.
        </p>
      )}
    </div>
  );
}