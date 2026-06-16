import type { StripeElementsOptions } from '@stripe/stripe-js';

export const stripeFonts: StripeElementsOptions['fonts'] = [
  {
    family: 'Titillium Web',
    cssSrc:
      'https://fonts.googleapis.com/css2?family=Titillium+Web:ital,wght@0,200;0,300;0,400;0,600;0,700;0,900;1,200;1,300;1,400;1,600;1,700&display=swap',
  },
];

export const stripeAppearance: StripeElementsOptions['appearance'] = {
  labels: 'above',
  inputs: 'condensed',
  variables: {
    fontFamily: 'Titillium Web',
    fontSizeBase: '16px',
    fontSizeSm: '14px',
    fontSizeLg: '18px',
    colorPrimary: 'white',
    colorTextPlaceholder: '#fff',
    colorBackground: '#FFFFFF00',
    colorTextSecondary: 'white',
    colorText: '#fff',
    iconColor: '#fff',
    borderRadius: '8px',
    spacingUnit: '10px',
    gridRowSpacing: '20px',
    gridColumnSpacing: '20px',
    focusBoxShadow:
      '0 0 0 1px var(--p-colorPrimaryAlpha20), 0 1px 1px 0 var(--p-colorBackgroundContrastAlpha08)',
  },
  rules: {
    '.Input:focus': {
      color: '#002766',
      fontWeight: '700',
      borderColor: 'none',
    },
    '.Input::placeholder': {
      color: '#a2a2a2',
      fontSize: '12px',
    },
    '.Input': {
      color: '#002766',
      border: '1px solid rgba(0, ​39, 102, 0.24)',
      // boxShadow: '0 2px 8px rgba(0, 0, 0, 0.16)',
      fontSize: '16px',
      fontWeight: '500',
      padding: '10px',
    },
    '.Label': {
      color: '#002766',
      fontSize: '14px',
      fontWeight: '400',
      marginBottom: '8px',
    },
    '.Tab': {
      border: '1px solid rgba(0, ​39, 102, 0.24)',
      borderRadius: '6px',
      // boxShadow: '0 2px 8px rgba(0, 0, 0, 0.16)',
    },
    '.Tab--selected': {
      borderColor: '#002766',
    },
    '.CheckboxLabel': {
      color: '#002766',
    },
  },
};
