import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build output
    "dist/**",
    // Electron main process + standalone server (CommonJS, not part of the Next build)
    "electron/**",
    "server.js",
    "setup.js",
    // Root-level helper scripts (CommonJS)
    "verify-user.js",
    "create-test-user.js",
    // Google Apps Script backends (deployed separately to Google, not app code)
    "3EJS_Sheets_API*.ts",
    "SHEETS_CODE.js",
  ]),

  // Calibrate rules that eslint-config-next (Next 16) enables strictly but that
  // this codebase does not enforce. Keep them as warnings so `lint` stays green
  // in CI without churning many files; tighten later if desired.
  {
    rules: {
      // Tests and polyfills intentionally loosen typing for ergonomics.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      // New React 19 hook rule that flags common/intentional sync-in-effect patterns.
      "react-hooks/set-state-in-effect": "off",
      // Cosmetic rule; straight quotes in JSX are intentional UI copy.
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
