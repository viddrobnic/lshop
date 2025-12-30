import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import solid from "eslint-plugin-solid/configs/typescript";
import globals from "globals";
import tanstackQuery from "@tanstack/eslint-plugin-query";

export default [
  js.configs.recommended,
  ...tanstackQuery.configs["flat/recommended"],
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": tseslint,
      solid: solid.plugins.solid,
    },
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...tseslint.configs.strict.rules,
      ...solid.rules,
    },
  },
  {
    ignores: ["dist/**", "node_modules/**"],
  },
];
