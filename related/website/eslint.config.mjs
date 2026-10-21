import {defineConfig, globalIgnores} from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

// Preserve the existing hooks lint policy during the renderer upgrade.
// React Compiler is not enabled for the imperative GSAP/Three.js components.
const hookRules = new Set(['react-hooks/rules-of-hooks', 'react-hooks/exhaustive-deps']);
const compatibleVitals = nextVitals.map(config => ({
  ...config,
  ...(config.rules && {rules: Object.fromEntries(Object.entries(config.rules).filter(
    ([name]) => !name.startsWith('react-hooks/') || hookRules.has(name),
  ))}),
}));

export default defineConfig([
  ...compatibleVitals,
  ...nextTypescript,
  globalIgnores(['.next/**', '.next-*/**', 'node_modules/**', 'coverage/**', 'playwright-report/**', 'test-results/**', 'next-env.d.ts']),
]);
