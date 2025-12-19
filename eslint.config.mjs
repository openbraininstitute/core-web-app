import { defineConfig, globalIgnores } from "eslint/config";
import jsxA11Y from "eslint-plugin-jsx-a11y";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    globalIgnores(["**/*.js", "**/*.jsx", "**/*.mjs", "**/vitest.config.ts"]),
    {
        extends: compat.extends("airbnb", "airbnb-typescript", "next", "next/core-web-vitals", "prettier"),

        plugins: {
            "jsx-a11y": jsxA11Y,
        },

        languageOptions: {
            ecmaVersion: 5,
            sourceType: "script",

            parserOptions: {
                project: "./tsconfig.json",
            },
        },

        rules: {
            "@typescript-eslint/no-unused-vars": ["error", {
                argsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^_",
                ignoreRestSiblings: true,
            }],

            "prefer-template": "off",
            "react/jsx-no-useless-fragment": "off",
            "@typescript-eslint/no-use-before-define": "off",
            "@typescript-eslint/return-await": "off",
            "arrow-body-style": "off",
            "class-methods-use-this": "off",
            "consistent-return": "off",
            "no-plusplus": "off",
            "import/no-cycle": "off",

            "import/order": ["error", {
                pathGroups: [{
                    pattern: "**/*.+(css|scss|less)",

                    patternOptions: {
                        dot: true,
                        nocomment: true,
                    },

                    group: "unknown",
                    position: "after",
                }, {
                    pattern: "{.,..}/**/*.+(css|scss|less)",

                    patternOptions: {
                        dot: true,
                        nocomment: true,
                    },

                    group: "unknown",
                    position: "after",
                }],
            }],

            "import/prefer-default-export": "off",
            "no-await-in-loop": "off",
            "no-continue": "off",
            "no-restricted-exports": "off",
            "no-restricted-syntax": ["error", "ForInStatement", "LabeledStatement", "WithStatement"],
            "no-underscore-dangle": "off",

            "padding-line-between-statements": ["error", {
                blankLine: "always",
                prev: "*",
                next: "function",
            }],

            "prefer-regex-literals": "off",
            "react/require-default-props": "off",

            "react-hooks/exhaustive-deps": ["error", {
                additionalHooks: "useDebouncedCallback",
            }],
        },
    },
]);