import {expect, test} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';

// Exercise the production renderer Next actually ships for the App Router.
// React #35494 fixes replaying a host whose Flight child resolves in a microtask.
// Loading these modules directly makes the formerly intermittent failure
// deterministic without involving our page animations or a running server.
const require = createRequire(path.join(process.cwd(), 'package.json'));
const compiledDirectory = path.join(path.dirname(require.resolve('next/package.json')), 'dist/compiled');
const rendererModules = [
  ['next/dist/compiled/react', 'react/cjs/react.production.js'],
  ['next/dist/compiled/react-dom', 'react-dom/cjs/react-dom.production.js'],
  ['next/dist/compiled/scheduler', 'scheduler/cjs/scheduler.production.js'],
  ['next/dist/compiled/react-dom/client', 'react-dom/cjs/react-dom-client.production.js'],
];

test('a host replay preserves identical server HTML when its Flight child resolves', async ({page}) => {
  const modules = await Promise.all(rendererModules.map(async ([name, file]) =>
    `${JSON.stringify(name)}: function(module, exports, require) {\n${await readFile(path.join(compiledDirectory, file), 'utf8')}\n}`,
  ));
  await page.setContent('<div id="probe"><div class="lumiq-root"><div class="bg-layer">SSR copy</div></div></div>');
  await page.addScriptTag({content: `(() => {
    const modules = {${modules.join(',')}};
    const cache = {};
    const require = name => {
      if (cache[name]) return cache[name].exports;
      const module = {exports: {}};
      cache[name] = module;
      modules[name](module, module.exports, require);
      return module.exports;
    };
    const React = require('next/dist/compiled/react');
    const {hydrateRoot} = require('next/dist/compiled/react-dom/client');
    const container = document.getElementById('probe');
    const state = window.hydrationProbe = {errors: [], original: container.firstElementChild, committed: false};
    function Child() {
      React.useEffect(() => {state.committed = true;}, []);
      return React.createElement('div', {className: 'bg-layer'}, 'SSR copy');
    }
    // Flight thenables carry their own fulfillment status; an ordinary Promise
    // takes a different React unwind path and does not reproduce the defect.
    const child = React.lazy(() => ({
      status: 'pending',
      then(resolve) {
        queueMicrotask(() => {
          this.status = 'fulfilled';
          this.value = {default: React.createElement(Child)};
          resolve(this.value);
        });
      }
    }));
    React.startTransition(() => hydrateRoot(
      container,
      React.createElement('div', {className: 'lumiq-root'}, child),
      {onRecoverableError: error => state.errors.push(error.message)}
    ));
  })();`});
  await page.waitForFunction(() => (window as typeof window & {hydrationProbe: {committed: boolean}}).hydrationProbe.committed);
  const result = await page.evaluate(() => {
    const state = (window as typeof window & {hydrationProbe: {errors: string[]; original: Element}}).hydrationProbe;
    return {errors: state.errors, reusedServerRoot: document.querySelector('.lumiq-root') === state.original};
  });
  expect(result.errors).toEqual([]);
  expect(result.reusedServerRoot).toBe(true);
  await expect(page.locator('.bg-layer')).toHaveText('SSR copy');
});
