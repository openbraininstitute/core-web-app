/**
 * THIS FILE WAS AUTO-GENERATED.
 * PLEASE DO NOT EDIT IT MANUALLY.
 * ===============================
 * IF YOU'RE COPYING THIS INTO AN ESLINT CONFIG, REMOVE THIS COMMENT BLOCK.
 */

import path from 'node:path';

import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import { configs, plugins } from 'eslint-config-airbnb-extended';
import prettierConfigImport from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
const { rules: prettierConfigRules } = prettierConfigImport;
import plugin from '@stylistic/eslint-plugin';
import tsPlugin from '@typescript-eslint/eslint-plugin';

const gitignorePath = path.resolve('.', '.gitignore');

const jsConfig = [
  // ESLint Recommended Rules
  {
    name: 'js/config',
    ...js.configs.recommended,
  },
  // Stylistic Plugin
  plugins.stylistic,
  // Import X Plugin
  plugins.importX,
  // Airbnb Base Recommended Config
  ...configs.base.recommended,
];

const nextConfig = [
  // React Plugin
  plugins.react,
  // React Hooks Plugin
  plugins.reactHooks,
  // React JSX A11y Plugin
  plugins.reactA11y,
  // Next Plugin
  plugins.next,
  // Airbnb Next Recommended Config
  ...configs.next.recommended,
];

const typescriptConfig = [
  // TypeScript ESLint Plugin
  plugins.typescriptEslint,
  // Airbnb Base TypeScript Config
  ...configs.base.typescript,
  // Airbnb Next TypeScript Config
  ...configs.next.typescript,
];

const prettierConfig = [
  // Prettier Plugin
  {
    name: 'prettier/plugin/config',
    plugins: {
      prettier: prettierPlugin,
    },
  },
  // Prettier Config
  {
    name: 'prettier/config',
    rules: {
      ...prettierConfigRules,
      'prettier/prettier': 'error',
    },
  },
];

export default [
  // Ignore .gitignore files/folder in eslint
  includeIgnoreFile(gitignorePath),
  // Javascript Config
  ...jsConfig,
  // Next Config
  ...nextConfig,
  // TypeScript Config
  ...typescriptConfig,
  // Prettier Config
  ...prettierConfig,
  // Disable stylistic plugin completely
  {
    rules: {
      ...Object.fromEntries(Object.keys(plugin.rules).map((rule) => [`@stylistic/${rule}`, 'off'])),
      ...Object.fromEntries(
        Object.keys(tsPlugin.rules).map((rule) => [`@typescript-eslint/${rule}`, 'off'])
      ),
      '@typescript-eslint/no-unused-vars': 'off',
      //   [
      //     'error',
      //     {
      //       argsIgnorePattern: '^_',
      //       caughtErrorsIgnorePattern: '^_',
      //       ignoreRestSiblings: true,
      //     },
      //   ],
      'react/prop-types': 'off', // TODO: should be checked
      'import-x/no-unresolved': 'off', // TODO: should be checked (it's only for /src/query-provider/server.tsx, Unable to resolve path to module 'server-only')
      'prefer-object-has-own': 'off',
      'jsx-a11y/heading-has-content': 'off',
      'prefer-template': 'off',
      'react/jsx-no-useless-fragment': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/return-await': 'off',
      'arrow-body-style': 'off',
      'class-methods-use-this': 'off',
      'consistent-return': 'off',
      'no-plusplus': 'off',
      'import-x/no-cycle': 'off',
      'import-x/order': [
        'error',
        {
          pathGroups: [
            {
              pattern: '**/*.+(css|scss|less)',

              patternOptions: {
                dot: true,
                nocomment: true,
              },

              group: 'unknown',
              position: 'after',
            },
            {
              pattern: '{.,..}/**/*.+(css|scss|less)',

              patternOptions: {
                dot: true,
                nocomment: true,
              },

              group: 'unknown',
              position: 'after',
            },
          ],
        },
      ],

      'import-x/prefer-default-export': 'off',
      'no-await-in-loop': 'off',
      'no-continue': 'off',
      'no-restricted-exports': 'off',
      'no-restricted-syntax': ['error', 'ForInStatement', 'LabeledStatement', 'WithStatement'],
      'no-underscore-dangle': 'off',

      'padding-line-between-statements': [
        'error',
        {
          blankLine: 'always',
          prev: '*',
          next: 'function',
        },
      ],

      'prefer-regex-literals': 'off',
      'react/require-default-props': 'off',

      'react-hooks/exhaustive-deps': [
        'error',
        {
          additionalHooks: 'useDebouncedCallback',
        },
      ],
    },
  },
];
