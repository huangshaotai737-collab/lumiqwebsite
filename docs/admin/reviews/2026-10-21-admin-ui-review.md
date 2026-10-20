# Independent admin presentation review — 2026-10-21

**Current review status: all reported palette findings are closed.** The final closure addendum below supersedes the earlier “with fixes” verdicts; those earlier sections remain as the review history.

Reviewed `/Users/huangshaotai/Documents/lumiqwebsite-responsive-local-20261013`, branch `codex/admin-platform-design-20261020`, against `4155c8d61c38735026faf7ddd0a555bcb85c3063`. The reviewed implementation is the current uncommitted diff, including the untracked `app/admin-ui.css` and `features/shell/AdminIcon.tsx`.

## Strengths

- The diff remains within the admin presentation layer and its shell test. No API route, service, authorization helper, generated contract, database migration, website source, dependency, or runtime configuration changed.
- Catalog and media business-sensitive lines (requests, request bodies, handlers, disabled conditions, and input change/submit handlers) remain byte-identical to the base. The added catalog/media containers preserve the original component order and contents.
- Dashboard count expressions, null filtering, destinations, recent audit limit text, timestamp timezone, action labels/fallback, action/entity IDs, empty state, unavailable state, and sign-out control are retained. New shortcut links use the same permitted non-null metric cards and existing destinations.
- The shell preserves the exact role-to-route mapping: admin gets all original routes; editor gets content/media/audit; operations gets catalog/customers/waitlist/orders/audit; missing-role modules remain disabled. Separate pages remain separate. Nested content/order pages now mark their parent navigation item as current.
- Decorative SVGs are hidden from assistive technology. Sidebar links retain explicit accessible names, collapsed links have titles, both toggle controls have names/expanded state/control association, and the skip link/main target remain intact.

## Issues

### Important / P2 — restore readable contrast for the new small-text palette

The new stylesheet lowers informational text below the normal-text contrast threshold:

| Location | Foreground / background | Contrast | Affected text |
| --- | --- | ---: | --- |
| `related/admin/app/admin-ui.css:58` | `#6b7d97` / `#f5f7fb` | 3.912:1 | 12px page eyebrow text |
| `related/admin/app/admin-ui.css:96` | `#6a7b93` / `#ffffff` | 4.314:1 | 12px recent-operation timestamps |
| `related/admin/app/admin-ui.css:100` | `#6a7b93` / `#ffffff` | 4.314:1 | Dashboard empty-state text |
| `related/admin/app/admin-ui.css:126` | `#6c7b91` / `#f7f9fc` | 4.080:1 | 12px table headings across admin pages |

These are informational text, not decorative marks or inactive controls. At these sizes they need at least 4.5:1 for WCAG AA. The change is especially relevant to the compact table headings and audit timestamps, which users must read to interpret records. [W3C SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) specifies the threshold and confirms that underlying stylesheet colors can be used for evaluation.

Fix by darkening these informational text colors. For example, `#5f6e84` yields 4.834:1 against the canvas, 4.916:1 against the table heading background, and 5.185:1 against white. Keep decorative icons and disabled controls separate; they are not part of this finding. Ratios above were calculated from the stylesheet's sRGB values using the WCAG relative-luminance formula, without rounding to decide whether they pass.

### Critical

None found in this review.

### Minor

None recorded. Formatting compression alone is not a functional regression.

## Functional-equivalence and CSS self-check

| Area | Independent review result |
| --- | --- |
| Catalog | Offering IDs/version keys, currency/amount controls, price confirmation and enabled dependency, read-only operations view, terms approval, order switch, save payloads, conflict/permission/network messages preserved. Grid uses wrappers/classes only. |
| Media | Upload form, profile constraints, file acceptance, completion/archival handlers, busy states, search and all filters, total/page counts, actual-reference details/truncation notices, previews and pagination preserved. |
| Content list/editor/history/picker | No source changes. Global style selectors checked against save/submit/publish/preview, conflict download/reload, issue location, locale/page/group/search filters, field pagination, read-only media URLs, media selection and rollback controls. No new selector hides these controls. |
| Customers/waitlist | No source changes. Global button/input/textarea/table/detail styles do not change fields, data filtering, notes, status editing, CSV export, pagination or privacy-action conditions. |
| Orders/detail | No source changes. Existing `orders.css` continues to provide field sizing and local layout; the new stylesheet changes general colors, spacing and buttons. No operation/field visibility removal identified statically. |
| Team/invitation/login | Original role options, active checkbox, save/invite controls, statuses, password/email fields and hydration/configuration disabling preserved. Existing mobile team table layout remains in place. |
| Sidebar desktop | Expanded/collapsed changes affect widths and labels; original route destinations and role filtering remain. Sidebar scrolls independently on short viewports. |
| Sidebar mobile | At <=700px desktop toggle is hidden and mobile toggle controls nav display; `data-mobile-open` overrides the old collapsed-nav display rule at equal specificity later in the cascade. Selecting a route closes the mobile menu. Hidden menu links are removed from layout by `display:none`. |
| Responsive containers | Main uses `minmax(0,1fr)`/`min-width:0`; catalog and media stack at <=1120px; dashboard columns stack at <=850px; narrow-screen form filters stack; tables retain their scrolling containers. No static evidence of original controls being clipped or overlaid. Browser geometry still requires the owner’s checks. |
| Scope boundary | Only the seven originally listed tracked admin files and two new admin presentation files are changed. No website or server/business-layer change detected. |

## Validation evidence and limits

- Independent `git diff --check`: passed.
- Read the recorded current-mirror validation logs: build/typecheck/lint exit 0; 16 Vitest files / 130 tests passed; four boundary/contract Node tests passed. These are owner-run results, not a fresh test run by this reviewer.
- Read-only static review covered all changed source and the existing global/order styles, affected forms, navigation, roles, error states, field availability and relevant page composition.
- No browser sessions, screenshots, database/auth/storage mutations, fixture setup, build/runtime changes, index changes or commits were performed. All-page first-viewport captures, runtime geometry, keyboard interaction and responsive browser validation remain with the owner as explicitly assigned. This report does not certify those checks from source inspection.

## Declined to judge

- Live production/backend/DB/Auth/Storage behavior: outside this presentation diff and explicitly excluded from the reviewer’s allowed actions. Existing business behavior was compared in source; no live mutation was attempted.
- Website visual/functional behavior: no website source changed and the request is admin-only. This review does not claim a new website acceptance pass.

## Assessment

**Ready for acceptance: with fixes.** Fix the P2 small-text contrast regression before final acceptance. No business-behavior regression was identified in the reviewed diff. The owner still needs to finish the required all-page screenshots and browser interaction/geometry checks; static review and the recorded unit/build results do not replace them.

## Targeted follow-up review — palette and SKU alignment

The four locations in the original contrast finding (`:58`, `:96`, `:100`, `:126`) now use `#5f6e84`; the original locations are resolved. Independently recalculated ratios are 5.185006:1 on white, 4.834353:1 on canvas `#f5f7fb`, and 4.916067:1 on table-heading background `#f7f9fc`.

One further instance of the same P2 contrast issue remains in this follow-up snapshot: `related/admin/app/admin-ui.css:133` uses `#697a91` for 13px `dt` labels, which produces 4.381086:1 on white. This applies to settings labels (`app/(protected)/settings/page.tsx:30`) and order-detail totals labels (`features/orders/OrderDetail.tsx:94`). Use the same darker label shade here. These are normal informational text, so the 4.5:1 threshold applies.

The additional `align-content: start` at `admin-ui.css:140` only aligns the contents of the existing SKU field grid; it changes no controls, field conditions, values, handlers, or payloads. The tracked/untracked change boundary remains the same seven tracked admin files plus two new admin presentation files. `git diff --check` still passes; no backend, website, API, authorization, database, dependency, or runtime source change was introduced.

Read `final-build/build-results.json` and its logs: final build/typecheck/lint all exited 0, with no warning shown in those logs. The initial 130 Vitest and four boundary/contract tests remain the recorded unit evidence. The existing `browser-results.json` at this snapshot is the earlier 03:38 result with 23 passing groups, including 14 page-control comparisons, responsive/mobile/sidebar checks, role-read permission checks, validation/failed-save feedback, logout, no browser errors, and preserved DB/auth rows. The owner's final post-alignment harness rerun and refreshed 14 screenshots were still in progress, so this addendum does not label that earlier JSON as the final rerun.

**Follow-up verdict: original contrast finding resolved at its four reported locations; finish the remaining `dt` text contrast correction.** No new functional regression found. Only this report was written during the independent re-review; no runtime operation was performed.

## Final palette closure review

Confirmed `admin-ui.css:133` now also uses `#5f6e84`. None of the five reported old informational text colors/locations remains unresolved. The definition labels now have 5.185006:1 contrast on their white panels; the other fixed contexts retain 4.834353:1 on canvas and 4.916067:1 on table-heading background.

A bounded static sweep of the new stylesheet's remaining normal informational text colors found no further contrast issue. This covered body/muted text (including muted text directly on the canvas), topbar text, status notices, panel copy, metric headings, audit details, quick links, enabled buttons, form values/labels, table body, upload copy/file-picker text, and sidebar navigation/group/account text. Their checked foreground/background pairs all exceed 4.5:1. Decorative symbols/separators and disabled controls were not treated as normal informational text. Hover text combinations remain readable against their declared hover backgrounds. This closes the palette finding rather than expanding the functional scope.

The final source scope is unchanged: seven tracked admin presentation/test files and two new admin presentation files, with no API/backend/authorization/database/website/dependency/runtime source change. The only addition since the previous follow-up is the `dt` color correction. `git diff --check` passes. No new functional regression was identified.

The latest `final-build/build-results.json` available during this review is timestamped 03:44:54 local and records build, typecheck, lint and test exit 0. The final test log independently confirms 16 Vitest files / 130 tests and four boundary/contract Node tests passed again. The browser evidence available at the review snapshot is the 03:42:34 post-alignment result: 23/23 groups pass, and the screenshot directory contains the 14 numbered page captures plus three mobile examples and a manifest. This is recorded evidence read by the reviewer, not a fresh browser run by the reviewer. The owner’s last harness rerun against the final `dt`-color build was still separate from that timestamped browser evidence. The owner also reports eight desktop/mobile unconfigured-shell checks passing; those are isolated development-shell evidence, not production-build evidence.

**Final independent verdict: no open code-review findings in the current admin presentation diff.** All reported contrast issues are resolved. Acceptance reporting should use the owner's latest completed browser artifact when the last rerun finishes. No production deployment or physical-device verification is claimed or required to close this scoped local presentation review. Only this allowed ignored report was written; the reviewer performed no runtime, database, auth, storage, index, branch or commit operation.

## Final browser evidence and delivery-document check

Read the final `browser-results.json` and `browser.log`, both updated at 03:47:28 local, after the final `dt`-color build. They record 23/23 passing browser groups and `screenshots 14; database preserved true`. This supersedes the previous addendum's pending final browser rerun. The final control-preservation evidence contains 14 entries with `equal: true` for every page, including the editor and order-detail routes.

Read the refreshed screenshot manifest and checked the PNG dimensions without changing images: all 14 listed desktop captures exist and are 1440×960, matching the manifest. Parsed the final before/after data-protection JSON snapshots in memory: their complete objects, including every supplied public/private table entry and `auth.users`, are exactly equal. No personal row values or credentials are included in this report. Read the isolated shell report: eight expected tests, zero unexpected, skipped or flaky tests. This remains development-shell fallback evidence, separate from the completed production-build and configured-browser evidence.

Read `docs/admin/ui-refresh-2026-10-21.md`. Its technical claims match the reviewed code boundary and supplied local evidence. It counts the four-width × 14-page matrix as 56 observations inside the 23 browser groups, does not inflate nested checks, describes the 15 role/read-API observations separately, distinguishes the eight isolated dev-shell checks, records intercepted failed-save behavior rather than asserting a real successful write, and retains the production/device/large-data limitations and the pre-existing open F1 issue. No substantive verification overstatement or new functional claim was found.

One time-sensitive wording note: the document's opening says the code is saved in the local development commit containing the record. That becomes accurate when the owner creates that final commit; if the delivery stays uncommitted, use “local development branch” instead. This is a packaging-status wording condition, not an unresolved UI/code defect.

**Final status: all reported palette findings closed; final local browser evidence read and passing; no open code-review findings or substantive delivery-document misstatement.** This last review only read existing evidence and appended this allowed ignored report. It did not run or alter the application, database, auth, storage, images, index, branch or commit state.
