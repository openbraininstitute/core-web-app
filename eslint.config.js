const { FlatCompat } = require('@eslint/eslintrc');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  {
    ignores: [
      '**/*.js',
      '**/*.jsx',
      '**/*.mjs',
      'vitest.config.ts',
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
    ],
  },
  // Use compat for Next.js config
  ...compat.extends('next/core-web-vitals'),
  // Add TypeScript ESLint configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      // Allow unused variables that start with underscore
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Allow flexible naming convention
      '@typescript-eslint/naming-convention': 'off',
      // Allow loop functions
      '@typescript-eslint/no-loop-func': 'off',
      // Disable some potentially problematic rules for Next.js
      'react/no-unescaped-entities': 'off',
      '@next/next/no-page-custom-font': 'off',
    },
  },
];
