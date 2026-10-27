# Mirror rendering follow-up

Changes: demand-driven canvas; 1.6-second settling window after input, selection or resize; late textures invalidate; offscreen still paused. Refraction buffer 768→512, transmission samples 6→4 on faces and 6→2 on reflections. Mirror structure retained. Idle pearl-light animation intentionally pauses.

Local production build, Chrome headless, 1440×900, five-second idle RAF/GL-call sample after readiness:
- Previous build: 12,341 WebGL draw calls, 301 RAF samples, p95 interval 16.7ms.
- Updated build: 0 WebGL draw calls, 301 RAF samples, p95 interval 16.7ms.
- No >33.4ms frames in either sample. This demonstrates reduced idle work, not a measured FPS gain or proof that the user's device is smooth.

Build passed. 26 Chrome/WebKit browser cases passed, covering refresh, return navigation, wheel traversal, 2560×640, mobile, unsupported WebGL, failed/slow artwork, idle draw cessation and interaction wake-up, viewport mode changes. Mirror screenshot inspected. Production alias not modified.

Scripts/logs: .lumiq-local/mirror-only-20261027/{measure.cjs,demand-tests.log,demand-build.log}; machine-local artifacts are not committed.

## Active-render follow-up

Replaced reflected glass transmission with a lightweight translucent material while preserving mirrored artwork/labels/rim; front samples 4→2; DPR capped at 1 rather than up to 1.25; DOM projection only writes changed matrices. High-density devices trade some canvas sharpness for fewer pixels; primary labels remain DOM text.

28 browser checks passed including deviceScaleFactor=2. Screenshot inspected. Continuous synthetic scroll-event samples with Chrome 4× CPU throttling: both old and updated builds produced 301 RAF samples in ~5s, p95 16.8ms, zero frames >33.4ms and 12,259 draw calls. This test does not reproduce the user's lag and does not demonstrate an FPS gain. GPU shader complexity and high-density pixel count were reduced; actual user-device benefit remains to verify. Synthetic event dispatch is not a full physical-scroll benchmark.
