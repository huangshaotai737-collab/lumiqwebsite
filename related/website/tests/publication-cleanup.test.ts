import {expect, it} from 'vitest';
import {cleanupPublicationFixture} from './support/publication-cleanup';

it('restores seed and disposes the fixture after a failed proxy reset', async () => {
  const calls: string[] = [];
  const failure = new Error('proxy unavailable');
  await expect(cleanupPublicationFixture({
    resetProxy: async () => { calls.push('reset'); throw failure; },
    restoreSeed: async () => { calls.push('restore'); },
    dispose: async () => { calls.push('delete'); },
  })).rejects.toMatchObject({errors: [failure]});
  expect(calls).toEqual(['reset', 'restore', 'delete']);
});
it('still disposes the fixture and reports all cleanup failures if restore fails', async () => {
  const calls: string[] = [];
  await expect(cleanupPublicationFixture({
    resetProxy: async () => { throw new Error('proxy unavailable'); },
    restoreSeed: async () => { calls.push('restore'); throw new Error('restore failed'); },
    dispose: async () => { calls.push('delete'); },
  })).rejects.toMatchObject({errors: [expect.any(Error), expect.any(Error)]});
  expect(calls).toEqual(['restore', 'delete']);
});
