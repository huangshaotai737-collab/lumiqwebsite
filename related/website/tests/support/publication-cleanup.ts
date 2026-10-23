/** Cleanup must restore the published pointer even when the website proxy is
 * unavailable, then dispose the account/context regardless of either failure. */
export async function cleanupPublicationFixture(steps: {
  resetProxy: () => Promise<void>;
  restoreSeed: () => Promise<void>;
  dispose: () => Promise<void>;
}) {
  const errors: unknown[] = [];
  try {
    try { await steps.resetProxy(); } catch (error) { errors.push(error); }
    try { await steps.restoreSeed(); } catch (error) { errors.push(error); }
  } finally {
    try { await steps.dispose(); } catch (error) { errors.push(error); }
  }
  if (errors.length) throw new AggregateError(errors, 'Publication fixture cleanup failed after all cleanup attempts');
}
