# Fixed glass homepage carousel

Replaced the homepage WebGL host with a server-rendered footprint. Existing public product links now render with a fixed SVG glass skin and aria-hidden/inert mirrored copies. No homepage import of GlassCards/Three/R3F. The separate glass-preview experiment is retained and does not run on the homepage. Mirror is a fixed visual approximation, not realtime refraction.

Data remains from the same CMS/localized fields. Regenerated private visual preview from public source. Native phone carousel retained, decorative reflection desktop only. Existing navigation and background-video readiness fixes retained.

Production build passed; 42 Chrome/WebKit cases passed: no-JavaScript five-card rendering, WebGL disabled, carousel arrows, keyboard, product navigation, mobile, return/reload/back/wheel, deferred video first-frame, and readable labels in zh-hant/en/ja across 1440×1000, 2560×640 and 3840×960. Visual screenshots at 1440×900 inspected. Updated renderer-specific assertions to DOM selectors while retaining label-size and overflow thresholds, because renderer removal is the approved behavior change.

Images still download normally. This removes the WebGL initialization gate, not all network latency. Static skin uses SVG gradients; live optical refraction and pointer-driven tilt intentionally removed. Production alias not overwritten.
