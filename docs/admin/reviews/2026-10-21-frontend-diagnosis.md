# Public interaction audit: frontend follow-up (2026-10-21)

## Scope and result

Only `related/website/tests/e2e/home-family-horizontal.spec.ts` changed: two setup lines after `stage.hover()` explicitly center the family stage using `behavior: 'instant'` before capturing `scrollY`. The exact equality assertion and horizontal-wheel input are unchanged. No production component, input helper, CSS, mobile-experience test, shared verification source/build, preview configuration, database, or remote state was changed.

Family failure: confirmed test preparation race, corrected and verified. Film counter failure: reproduced and left visible; no source fix claimed. Record it as an unresolved P3 browser rendering / interaction performance risk pending profiling, particularly under Chromium mobile emulation at a wide viewport.

## Family reproduction and root cause

The original audit reported desktop `5356 -> 5497` after a horizontal wheel even though family selection changed successfully. Read the full family test, HomeFamily, HomeFilms, HomeMotion, homePosition, readingNavigation, CarouselInput, openingVideo, preloadScenes, responsive layout, mobile carousel, relevant CSS, and current repository handoff rules before editing.

Instrumented fresh browser contexts against the unmodified delivered 4211 runtime recorded a wheel with `defaultPrevented=true`, no application `scrollTo` during the gesture, and scrolling that had already started before the wheel. One example: baseline scrollY5066 at12426.6ms; scrollY5069 at12442ms; canceled wheel at12459ms with scrollY5083; scroll ends5207 at12609ms. Family selection commits1 later. HomeFamily consumes horizontal wheel input before advancing; it does not vertically scroll the page.

The CSS rule `html:has(.lh-home) { scroll-behavior: smooth; }` combines with automatic Playwright scroll/hover preparation and the opening loading/fallback layout transition. The test captures scrollY while a native smooth scroll is still running. The opening's inert gate makes the timing sensitive to the first media load.

A controlled delayed-opening fallback establishes causality without a wheel: abort the opening video request after1200ms, perform the original stage scroll/hover, snapshot, and observe for900ms. Result:5066 ->5207 (+141), with no wheel event. In the corresponding instant-position control:5207 ->5207. Thus the assertion attributes existing setup movement to the later gesture.

The corrected setup explicitly finishes positioning after hover, before sampling. It does not disable smooth scrolling globally, change viewport/motion preferences, add waiting delays, increase tolerances, or weaken selection/scroll assertions.

## Film reproduction and limits

The original audit failed mobile project's `a narrow computer window switches stories to mobile controls and preserves the selected story`: after resizing its viewport to1440x900, the first desktop next click remained01 during the default5000ms expectation.

The exact unmodified two-test target was repeated three times per project against the owned stock4281 runtime:12 cases,10 passed,2 failed. Both failures were the mobile-project film counter assertion; all six family cases happened to pass in that repetition. Log:`frontend-ui/focused-original.log`.

The failing Playwright trace was inspected before the subsequent family run reused the output directory. It shows the click entering the handler: after-click `.lh-films-stage[data-moving=true]` and both controls disabled. The text assertion polled01 for roughly0.6s and then browser responses stalled until its timeout; its after-expect DOM snapshot already contained02 and `data-moving=false`. This was not a lost click. The intermediate failure trace ZIP was overwritten by the later focused family run; the command output and observations are preserved here. Do not treat its old path as a retained artifact.

A separate event/timer/long-task probe on4281 measured the real click lifecycle with the unmodified component:

- Timer created308ms; trusted click observed309ms.
-800ms timer fired1172ms; controls/data-moving returned to their unlocked state1173ms. Actual disabled interval:864ms.
- Recorded long tasks:62ms,122ms,219ms.
- A later browser command returned only at5428.3ms with counter02.

The probe does not prove every failing run unlocks within864ms. The failure is intermittent and browser/GPU scheduling was visibly expensive in these headless contexts. There is no evidence here of a cleared timer, missing handler, incorrect selected index, or a lifecycle defect that would justify a component change. `transitionend` also requires the same main thread, so replacing the timer without profiling is unsupported. Per root's request, do not introduce readiness waits, larger timeouts, a mobile-project skip, or an early counter update merely to turn this case green. The film test and component are unchanged; the performance risk remains unresolved.

## Actual RED / GREEN and commands

Working directory for all commands: `/Users/huangshaotai/Documents/lumiqwebsite-responsive-local-20261013`.

1. Original audit RED (root-owned):74 cases;57 passed,15 skipped,2 failed. Log:`.lumiq-local/audit-20261021/public-interactions.log`.
2. Exact original focused repetition RED:

   `related/website/node_modules/.bin/playwright test -c .lumiq-local/audit-20261021/frontend-ui/focused.config.mts --grep 'a horizontal trackpad|a narrow computer' --repeat-each=3`

   Result:10 passed,2 failed (both mobile film first-counter assertions),1.3minutes. Log:`frontend-ui/focused-original.log`. No source/test edits preceded this run.
3. Family preparation RED/control:

   `node .lumiq-local/audit-20261021/frontend-ui/timing-probe.cjs`

   Result:no-wheel control5066 ->5207; instant control5207 ->5207; film timing as above. The diagnostic uses900ms only to observe the setup scroll, not as a new test timeout or implementation fix. Logs/data:`frontend-ui/timing-probe.log`, `frontend-ui/timing-probe.json`.
4. Corrected family e2e GREEN:

   `related/website/node_modules/.bin/playwright test -c .lumiq-local/audit-20261021/frontend-ui/focused.config.mts --grep 'a horizontal trackpad'`

   Result:2 passed (desktop and mobile),6.0seconds. Log/data:`frontend-ui/family-green.log`, `frontend-ui/family-green.json`.
5. Corrected family with deterministic delayed-opening fallback GREEN:

   `node .lumiq-local/audit-20261021/frontend-ui/family-fallback-green.cjs`

   Result:after the same1200ms delayed video abort, scrollY5207 ->5207 while selected family becomes1 under DPR3/mobile emulation. Log/data:`frontend-ui/family-fallback-green.log`, `frontend-ui/family-fallback-green.json`.
6. `git diff --check -- related/website/tests/e2e/home-family-horizontal.spec.ts`:exit0.

An initial runner setup attempt used the verification Playwright binary with original-tree tests, which loaded two different copies of Playwright; it produced a runner initialization error, not a product failure. The successful commands above use the original tree's matching binary. An exploratory8-iteration film script stopped after two completed runs because its next auto-scroll/click hit a30s action timeout; it is not counted as a green test run.

## Changed files and handoff

Tracked change owned by this follow-up:

- `related/website/tests/e2e/home-family-horizontal.spec.ts` (two added setup lines).

Ignored diagnostic/report outputs live only under `.lumiq-local/audit-20261021/frontend-ui/` and this report. All probes/browser processes launched here have completed. No4294 sandbox/runtime was needed. Existing4211/4281 and original4240/4241/4242 previews were neither restarted nor killed. No shared mirror refresh, build, account write, waitlist submission, data reset, commit, push, merge, or deployment was performed. Root owns the consolidated build/review/delivery refresh and any broader final test run.
