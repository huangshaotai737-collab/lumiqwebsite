# LumiQ admin platform — final whole-branch review

Reviewed base `351334d1d5b4f1e69f52af649625a27cf2f5996b` to HEAD `8eef893181798088433f26b806e16c659f7b216c` on 2026-10-20. Repository root: `/Users/huangshaotai/Documents/lumiqwebsite-responsive-local-20261013`. File references below are relative to that root.

**Verdict: With fixes.** Three Important findings remain, including a cross-account mutation problem in ordinary member flows. Two Minor findings also deserve explicit disposition. This is a source/integration review of the complete delivery scope, not a replacement for the independent task gates or a claim of production readiness.

## Strengths

- The two application roots have independent package/lock/build configuration. The website reads Supabase directly; its published-content availability does not depend on the admin server being online. Canonical contract copies and shared database types are kept inside each application.
- Authorization is substantive: verified Auth identity plus current profile/staff rows, closed table grants/RLS, fixed-search-path routines, and repeated authorization inside privileged transactions. Team changes serialize with sensitive staff mutations, last-admin protection is transactional, and audit history is append-only.
- The publishing design correctly bridges server FormatJS validation to database authority through a short-lived, actor/version/snapshot-bound receipt. Publishing/rollback, pointer changes, asset references and audit are transactional. Asset copies stay private until a released reference authorizes delivery; originals are not made public by an upload or a failed publish.
- Order creation uses server integer amounts, explicit native currencies, confirmed SKU/terms gates, stable catalog locking, immutable snapshots and owner-scoped idempotency. Existing-key recovery precedes new commercial validations. Internal notes remain outside customer DTOs. The fixed disabled payment adapter and database status constraints do not offer a path to a fake paid/shipped order.
- The privacy workflow has unusually careful failure semantics: owner-confirmed policy, suspension before external work, expiring claims, current acting-admin checks, real Auth readback, explicit metadata clearing, resumable failure, and financial/audit preservation. It does not conflate application erasure with deletion from every external system.
- Acceptance documentation now distinguishes failed full runs, scoped reruns, source-input provenance, software-rendered visual proof, unexecuted CI/production work and remaining diagnostics. The local verifier refuses delivered preview data and retains ownership uncertainty instead of killing unknown processes or silently unlocking.

## Issues

### Critical (must fix)

None established in this review. In particular, I did not establish anonymous draft/customer disclosure, arbitrary paid-state mutation, a service-secret exposure, or a financial-history erasure path.

### Important (should fix before merge)

#### I1 — Bind member mutations and retained member UI to the identity that opened the form [P1]

- **Locations:** `related/website/features/account/AccountPanel.tsx:12`, `:26`; `related/website/app/api/account/profile/route.ts:26`; `related/website/features/account/service.ts:62`; `related/website/features/account/ResetPasswordForm.tsx:19`; `related/website/app/api/auth/reset/route.ts:29` and `:38`. Parent retained profile state is also in `related/website/components/MembersArea.tsx:17`.
- **Trigger and behavior:** Open A's member profile in one tab. In another tab of the same browser context, sign out A and sign in B. The first tab retains A's name/address, does not listen for the existing `lumiq-account-revision` event or revalidate on focus/pageshow, and submits no expected identity. Its PATCH is authenticated with B's current cookies; `updateOwnProfile` selects B's current `userId` and writes A's retained values into B's row. This is a cross-account data overwrite caused by an ordinary tab/session change, even though database RLS is correctly enforcing the currently authenticated user.
- **The same defect affects password updates:** A recovery/update tab receives only `update`/`expired` booleans, retains no bound user ID, and PATCH `/api/auth/reset` changes whichever verified user is currently in the cookies. After B signs in elsewhere, A's stale update form can therefore change B's password and globally sign out B.
- **Why it matters:** Wrong-account address/name mutation and password changes violate the real-account requirement and reasonable shared-browser behavior. The existing checkout/order generation guards show that this integration class is recognized, but they do not protect the account forms. A's PII can also remain visible after a known account change, and an older save response can restore it.
- **Fix:** Bind profile/password forms to an explicit server-verified identity. At each mutation, compare that expected identity to the current verified session before writing; an untrusted ID must only restrict, never select another user's record. Hide/clear retained member data and disable submission on account-revision, pagehide/pageshow and focus revalidation; guard all asynchronous read/save completions with an identity generation. Clear/remount the parent sidebar/profile state too. Password-update pages need the same binding, not just a signed-in boolean.
- **Focused verification:** Two tabs in one context, A→B switch, stale profile save and stale password save must both refuse and leave B unchanged. Test signout without a replacement login, storage unavailable/focus recovery, BFCache return, and delayed A read/save completion after a newer B/failed check. Verify successful same-user edits still work and failed saves retain same-user input.
- **Evidence:** Source-proven call chain; no customer or Auth mutation was performed during this read-only review. Existing `customer-order-recovery.spec.ts` exercises checkout identity generations, not these forms.

#### I2 — The real workbench's draft metric is permanently zero [P2]

- **Location:** `supabase/migrations/20261020210000_customer_privacy.sql:149`.
- **What is wrong:** `get_admin_dashboard` counts `content_drafts where status='draft'`. The table constraint at `supabase/migrations/20261020053758_content_releases.sql:6` permits only `editing` and `submitted`; the save/submit functions also use those two states. No legitimate row can satisfy the dashboard predicate.
- **Why it matters:** Administrators and editors see “内容草稿 0” even with live drafts. This is not a harmless empty state: the approved C6 feature promises actual database counts, and the wrong value hides work needing attention.
- **Fix:** Define the card's intended count against the actual workflow states (normally all draft rows, or explicitly labelled editing/submitted subsets) and update the RPC through an append-only corrective migration. Do not rewrite the applied migration.
- **Focused verification:** Insert nonzero editing and submitted fixtures and assert the exact expected count for admin/editor, null for operations, and error behavior on a failed read. Current `customer-privacy.test.sql:27` only checks that the editor result is non-null; `features/dashboard/service.test.ts:16` mocks the count as 3; the privacy browser test checks the heading. Those checks cannot detect this SQL defect.

#### I3 — Operations cannot perform the approved read-only catalog inspection [P2]

- **Locations:** `related/admin/features/catalog/service.ts:102`; `supabase/migrations/20261020181500_orders_and_catalog.sql:146`; `related/admin/features/shell/AdminShell.tsx:29`.
- **What is wrong:** The approved role matrix at `docs/superpowers/specs/2026-10-20-lumiq-admin-platform-design.md:118` grants operations **read-only** access to actual SKU prices and submission switches. The navigation, service and SQL all restrict the catalog workspace to admin. Direct `/catalog` access returns the administrator-only error and there is no operations read-only counterpart.
- **Why it matters:** Operations staff handling orders cannot inspect which SKUs are enabled, unconfirmed or disabled, their configured prices, or the global order gate. The public `get_ordering_catalog` projection deliberately omits disabled/unconfirmed offerings and therefore does not implement the promised staff view.
- **Fix:** Add a narrow live admin/operations read projection and read-only catalog presentation/navigation for operations. Preserve admin-only write RPCs, approval controls and mutations; do not solve this by granting operations editor controls. No recorded ruling I read explicitly narrows the approved read permission.
- **Focused verification:** Operations can inspect the configured/unconfirmed/disabled state and global gate; cannot mutate via either HTTP or direct RPC; editor/customer/anonymous access to private catalog configuration remains denied. The current catalog browser fixture creates admin/editor/member roles, so it does not test this missing allowed-role path.

### Minor (nice to have; explicit ruling required if deferred)

#### M1 — Null asset IDs bypass the “read-only original media” integrity rule [P3]

- **Locations:** `supabase/migrations/20261020061839_media_assets.sql:209` and `:290`; `contracts/content-validation.ts:103`.
- **What is wrong:** Both SQL media guards skip provenance/profile checks when `assetId` is null (the publish guard only rejects a controlled `/api/media/` URL). The shared validator accepts any syntactically safe `/assets/…` URL in that case. The UI makes media URL fields read-only, but the save endpoint accepts the full caller-supplied snapshot. A caller can replace the supposedly read-only transparent Safari video with an ordinary opaque film while retaining null assetId, and validation/attestation does not identify the changed slot as invalid.
- **Focused pure probe performed:** Loaded the current canonical validator and FormatJS parser in memory, cloned the initial snapshot, changed only `media.asset_6f36183e6da5cc73.url` to `/assets/films-20260908/welcome-home.mp4`, and validated it. Result: `accepted: true`. No files/DB/release pointer were changed. The subsequent save/publish bypass is traced from the SQL null-ID branches, not claimed as a live publish test.
- **Why it matters / calibration:** This contradicts the documented read-only paired transparent-media limitation and can break the preserved Safari/person/timeline presentation. It requires a crafted authored snapshot and eventual admin publication; I found no privilege escalation or arbitrary script execution, so it is lower severity than I1.
- **Fix:** Treat null-ID references as exact trusted legacy references for their slot, especially read-only/complex paired groups; require controlled finalized assets for replacements. Enforce that rule at the server validation and database publish/selection boundary, with compatible treatment of proven historical releases. Add a negative validator/direct-RPC test for a swapped legacy URL and preserve the original snapshot/rollback path.

#### M2 — Published-content fallback suppresses the required operational warning [P3]

- **Location:** `related/website/lib/content/read.ts:21`.
- **What is wrong:** Database errors, invalid releases and parsing failures all fall through an empty catch to last-good/bundled content. The consumers use `.snapshot`; no warning or metric is emitted. The spec at `docs/superpowers/specs/2026-10-20-lumiq-admin-platform-design.md:156` explicitly requires a warning on fallback.
- **Why it matters:** A disconnected or incompatible content store can quietly serve stale content while the publishing workflow claims normal propagation. The fallback itself is correct; the missing signal prevents operators distinguishing resilience from a sustained outage.
- **Fix:** Emit a bounded/rate-limited server-side diagnostic with safe reason/source/release identifiers, never the snapshot, credentials, raw upstream response or customer data. Avoid treating an intentionally unconfigured local build as a production alert. Verify a repeated failure preserves last-good and produces an observable safe signal without log flooding.

## Recommendations

1. Address I1 first across both profile and password flows, then close I2/I3. Keep the fix wave bounded; these findings do not require redesigning the successful publishing/order/privacy architecture.
2. Add allowed-role tests as well as denial tests. Non-null/scoped metrics and “not authorized” checks did not prove a truthful positive count or the operations view that the role matrix promises.
3. Use append-only corrective SQL migrations. Re-run only changed-boundary SQL/unit/browser/static checks and regenerate type/contract artifacts when needed. Preserve the delivered preview and existing evidence; do not reset it for a cleaner final report.
4. Explicitly rule on M1/M2 and every declined judgment below. Retain production, runtime and historical-evidence qualifications after fixes; a clean scoped rereview does not retroactively create a full uninterrupted verifier run.

## Coverage and tests inspected

### Review method and actual coverage

- Read `final-review-context.md` first, the global constraints, all 39 chronological Ruling lines and deferred-minor entries in `progress.md`, the design/master and three subplans, reviewer template, repository guidance, acceptance/security/deployment documents and the supplied core/ops path inventories.
- Used the supplied 277-path core and 123-path tests/ops/docs companion inventories to organize bounded passes. Reviewed current HEAD source directly for concrete integration paths. I did **not** manually read every line of all 400 human-source paths or every line of the 8.83 MB full package. Routine visual adapters, repeated route wrappers, generated arrays and tests outside the named risk paths received inventory/pattern/structural or representative review rather than an invented line-by-line claim.
- **Authority/auth:** Read both applications' session/auth/server/refresh/origin/rate-limit helpers, shared auth policy, team service/mail/invite authorization, identity/team/request-limit SQL; scanned every API route for method/origin/service dispatch and traced the sensitive handlers. Inspected member login/register/recovery/profile code, member retained state and middleware/leaf shell.
- **CMS/media:** Read shared validation and ICU/policy generation logic, draft/publish/rollback services and attestation, content SQL, media business SQL apart from repeated profile-data rows, media service/prober/asset routes, preview loader, request snapshot/fallback, content boundary/provider, output adapter/CSS/metadata/image handling, editor controls, media picker and exporter/adapter drift guards. The targeted legacy-media probe exposed M1.
- **Commerce/operations/privacy:** Read order/catalog/operations/privacy/payment migrations, core service projections and guards, complete checkout/order member components, customer privacy saga, workbench, CSV/export and public waitlist routes, catalog UI/read path, and the role navigation. Checked lock ordering and current-identity boundaries across these modules; no new financial or privacy-saga corruption was established.
- **Local tooling/integration:** Read local capture/refusal/mirror preparation, preview environment/ingress/server/controller, unified verifier, lock and stage-owner implementation, and the new CI workflow. Inspected representative ownership/orphan/ingress tests and documented I1/I2 C7 correction evidence. Did not start/stop existing services or execute fixture stages.

### Structural verification performed during this review

- Read-only hash/size comparison verified all **31** excluded generated/data entries against the supplied manifest: **0 mismatches**.
- Independently compared canonical contracts against both generated app copies, the three paired content JSON artifacts, both database-type copies and the five immutable source-adapter hash entries: **0 drift**.
- Compared original three-locale message namespaces to the imported seed: **0 differences**; verified the exact five product IDs and **111** media slots.
- Executed only the in-memory media-validator probe described in M1. No database test, browser fixture, Auth write, full build/install, live external message, network provider call, push, merge or deployment was performed.
- HEAD was still `8eef893…`, and `git status --short` was empty before writing this ignored report. This report is the sole checkout write.

### Tests/evidence inspected, not rerun

- Inspected content snapshot/preservation and content-reader tests; selected content/media validator and SQL tests; dashboard SQL/mock/browser assertions; checkout identity recovery test; catalog allowed/denied-role fixture coverage; privacy actual-Auth failure/resume/readback browser assertions; generated-contract drift tests; preview-ingress and early-orphan ownership tests.
- Read the retained `verification/result.json`: it is **FAIL**, with the original admin-team phase exit 1 after earlier successful phases. Read the targeted contracts/database/checks/build/counterexamples/browser result manifests, which correctly represent scoped PASS results; the current targeted-browser manifest is only the admin-privacy resume. Read preview-build and fix2 result metadata.
- The acceptance record reports 511 SQL assertions, admin119/website151 unit results, final root41, independent stock builds and 218 distinct browser outcomes/21 conditional skips. These are retained implementation evidence, **not tests rerun by this reviewer**. Historical139 public outcomes have the explicitly documented provenance limit; I did not claim to recompute their per-file history or manually re-inspect all screenshots. Their existence does not remove the source-proven gaps above.

## Declined to judge

This is the complete list of behaviors deliberately set aside from a change request in this review. Each line needs the executor's explicit ruling; none is an implicit approval.

- **D1 — Production cloud deployment/domain/HTTPS/ingress correctness:** no target deployment was executed this cycle; local loopback ingress cannot prove the production trust topology.
- **D2 — Production email delivery, DNS, mailbox quotas and user receipt:** real local Auth/Mailpit evidence exists, but target SMTP and real external messages were not authorized/executed.
- **D3 — Production backup/restore and live migration preservation:** the local upgrade guard/harness and documented prerequisites are useful, but the target database, Auth and Storage recovery process remains unexecuted.
- **D4 — Real payment signatures, merchant matching, refunds, subscriptions, settlement and reconciliation:** the approved scope is interfaces only; the current fixed disabled adapter makes no provider-verification claim.
- **D5 — Legal adequacy of Taiwan merchant terms, privacy retention, shipping/refund promises or payment-provider eligibility:** the checklist is preparation material, not evidence of legal/business approval or merchant acceptance.
- **D6 — Real iOS Safari/Android, Firefox/WebKit, hardware GPU rendering and touch-device performance:** the record explicitly limits proof to actual executed browser/emulation/software-rendering environments; no new device claims are made.
- **D7 — A production WebGL-startup latency or animation-performance guarantee:** nine software-rendered captures and a longer readiness wait do not establish an SLA; no approved numerical performance target was supplied.
- **D8 — High-concurrency media delivery capacity and Range efficiency:** the public route buffers up to 50 MiB per request and downloads the full object for a range; deployment documentation explicitly requires capacity/timeout acceptance. I did not establish a failure at the authorized local workload or conduct load tests.
- **D9 — General Internet-scale request/body/resource-exhaustion resistance:** app/DB rate limits and media caps were reviewed, but no proxy body-limit or infrastructure load qualification was run; this must remain part of deployment hardening, not inferred from local functional tests.
- **D10 — Universal POSIX process containment:** the revised ownership code tracks observed groups and fails closed on unknown same-UID processes; it deliberately does not claim a sandbox against every short-lived/orphan/detached-process pattern.
- **D11 — Current upstream vulnerability status beyond the recorded lockfile audits:** I inspected dependency/runtime disclosures and preserved their exact qualifications; I did not refresh external advisory data or treat a development-only classification as remediation.
- **D12 — Root cause of the Node stream-cancellation diagnostic:** retained evidence supports the documented mechanism inference, not request-level causal proof. No new ordinary-load user-visible failure was established during this read-only pass.
- **D13 — External erasure of independent waitlist consent, exports, backups and provider logs:** these are explicitly excluded from application anonymization and require the data owner's separate policy/process.
- **D14 — Automated linked-provider/MFA identity erasure:** the saga rejects unsupported identity state and stays incomplete; enabling those identity providers is outside the delivered tested path.
- **D15 — Browser SSO between separately deployed admin and website:** separate cookie names, trusted website preview links and separate login are an intentional documented boundary; no shared-session requirement was approved.
- **D16 — Upload capability invalidation immediately on employee revocation:** already minted fixed-path upload URLs have a bounded provider lifetime; finalization and publication recheck live authority and objects remain private. I did not require retroactive cancellation of the provider capability.
- **D17 — Automatic revocation of an already issued staff invitation when its creator later loses admin status:** acceptance checks the stored invite, token, delivery, expiry and verified target. The invitation is a durable prior grant; no explicit issuer-lifetime policy was approved. The owner should confirm that interpretation.
- **D18 — Retired local-demo member copy remaining editable through CMS:** the exact retirement ledger/preserved seed supports the documented replacement by code-owned real-account copy. I did not require reintroducing fake member/device functionality or a new CMS schema.
- **D19 — Every repeated generated leaf receiving separate manual review:** canonical hashes, preservation checks and generator/consumer boundaries were reviewed structurally; claiming independent manual validation of millions of duplicate bytes would be misleading.
- **D20 — A single uninterrupted full verifier PASS, historical per-file hashes, or executed GitHub CI:** those outcomes do not exist in the supplied evidence and are explicitly disclaimed. I accepted scoped retained evidence as review input without upgrading its provenance.
- **D21 — Preventing an authenticated user from poisoning only their own profile through direct Data API writes with semantically malformed address JSON:** grants/RLS still restrict this to their own allowed columns; normal app writes validate address shape. I found no cross-user authority expansion from this avenue, and did not expand the fix wave into a new profile-storage schema.
- **D22 — Reworking all backend SQL formatting, duplicated per-app wrappers, or incidental UI polish:** dense SQL and repeated wrappers increase maintenance cost, but I requested changes only where they produced a concrete defect; large style refactors would dilute this final fix wave.

## Assessment

**Ready to merge? With fixes.**

I1–I3 should be resolved and independently rereviewed before a positive whole-branch verdict. The architecture is substantially aligned with the approved delivery, and the existing evidence is valuable, but it does not cover these concrete account-identity, metric and allowed-role gaps.

**Production qualification:** Even after those fixes, this remains a local implementation delivery. No push/merge/deploy/payment activation is authorized by this review. Production SMTP, domains/HTTPS/trusted ingress, target migrations/backups, retention approval, resource qualification and actual device/provider checks remain the documented gates.
