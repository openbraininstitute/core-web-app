import type { Preview } from '@storybook/nextjs-vite';

import '../src/styles/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#fafafa' },
        { name: 'white', value: '#ffffff' },
        { name: 'dark', value: '#001026' },
      ],
    },
  },
};

export default preview;
