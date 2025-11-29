import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },

    rules: {
      "filenames/match-regex": [0, "^[a-z][a-zA-Z0-9]*$", true],
      semi: ["error", "always"],
      quotes: ["error", "double", { allowTemplateLiterals: true }],
      indent: ["error", 2],
      "no-trailing-spaces": "error",
      "eol-last": ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: "off",
      "no-console": "off",
    },
  },
]);
