# Final whole-branch fix report

Status: implementation, covering scoped checks, delivery refresh and local commit complete; awaiting root scoped rereview. This is the single final fix wave for I1/I2/I3/M1/M2, based on `8eef893181798088433f26b806e16c659f7b216c`. No subagents. Root owns the one fresh scoped rereview.

## Design and behavior

- I1: canonical `AccountIdentityBinding.expectedUserId` is only a restriction on `requireUser()`'s current verified Auth identity. Missing/malformed identity returns INVALID_INPUT; mismatch returns FORBIDDEN before profile/password mutation. Existing active-user, verified-password, Origin, rate, no-store and native POST form gates remain. Reset-email POST stays public. A shared client identity hook starts hidden and reads the existing no-store profile API; every account-revision/storage/focus/pageshow/pagehide uncertainty advances a synchronous epoch, hides PII and invalidates older reads/saves. MembersArea owns the guard so the sidebar and device-tab transitions cannot retain A; profile forms remount by epoch/user. Password forms retain the server-rendered expected identity and never rebind to a newly signed-in B. Failure inputs are retained while identity stays established. Same-tab account notification now dispatches the existing revision event in addition to best-effort storage.
- I2: append-only migration corrects dashboard drafts to both `editing` and `submitted`, and explains that count on the card. Operations remains null; failed reads remain errors. Tests capture the actual base count (2 in this local dataset), then require base+2 for both admin/editor, avoiding a global-zero assumption.
- I3: live admin/operations authorization protects the private catalog read RPC/service/navigation. Operations receives all actual offerings, disabled/unconfirmed states, native minor-unit amounts, approved/current releases and global gate in a usable readonly presentation. Admin-only HTTP/service/SQL offering/commerce/approval writes are unchanged. No direct table grants or public projection widening.
- M1: canonical trusted per-slot legacy mapping is generated from the preserved initial snapshot and media profiles, with generator provenance checks. The pure validator rejects null-ID URL replacements and unsupported controlled-media replacements; both SQL selection and publication guards compare null-ID URL/kind/profile against the private trusted profile. Existing controlled-ready, exact same-slot archived/base inheritance, and proven immutable-history paths remain intact. No caller option or arbitrary-history exception was added. Server and DB validation policy advance together to `legacy-slots-v2-20261020`. New SQL is only `20261020223000_final_review_boundaries.sql`; no applied migration was edited.
- M2: configured content-store failures retain last-good/bundled fallback and emit `[lumiq-content-fallback]` at most once per minute per server reader. Only fixed reason/source and validated release UUIDs are emitted, never raw exception/data/secrets. Intentionally unconfigured local readers stay quiet.

## Genuine RED and GREEN

Full retained logs/testfiles/provenance are outside SDD under `.lumiq-local/evidence/final-fix/`. Do not infer an uninterrupted full verifier PASS.

| Boundary | Genuine RED | Final GREEN |
|---|---|---|
| I1 service/password route + M1 validator + M2 warning | Website8fail/5pass in `unit-website-red.log` | Expanded website67pass/5files in `website-focused.log` |
| I3 service | Admin1fail/3pass in `unit-admin-red.log` | Expanded admin76pass/6files in `admin-focused.log` |
| I2/I3/M1 SQL | 6fail/14assertions, `sql-red.log` | Expanded26assertions, `sql-green.log` |
| Real Auth/shared browser context | Five behavior failures, `browser-red-results.json` | Fourteen behavior passes plus protected-data equality, `browser-green-results.json` |
| Contracts/local boundary | Existing checks; no new RED claim |7pass, `root-focused.log` |
| Independent stock apps | No pre-fix build-failure claim | Both build/typecheck/lint exit0, `build-results.json` and six app logs |

Real browser proof uses two+ tabs in one Playwright Chromium BrowserContext; actual HTTP signin updates shared cookies, actual Supabase Auth users/passwords and actual app APIs are used. It covers A→B stale expected-A profile/password refusal; B profile unchanged; actual B old password succeeds and attempted replacement fails; A data/password hidden on focus; same-user profile success and failed-save input retention; delayed actual A GET after B; delayed A GET after failed newer check; delayed actual A PATCH after B; local/session storage getters unavailable with focus recovery; explicit persisted pagehide/pageshow event branches; actual navigate-away/back after cookie change; A→signed-out refusal/clearing; same-user password failure retention/success with real old/new-password verification; operations actual private UI/read RPC/all-five-offerings projection, absent edit controls, HTTP/direct-RPC write refusal and direct-table refusal. **Actual BFCache entry was not instrumented or claimed**; persisted events are synthetic, back navigation itself is real. The initial identity and mutation responses are server reads; delayed responses hold real app responses, not fabricated profile data.

SQL fixtures use generated unique UUIDs recorded before mutation, a baseline draft count and rollback-only transaction. They cover actual save RPC and attested publish RPC rejection without durable pointer mutation, original valid selection/historical guard, finalized controlled media selection/publish, exact archived inheritance and actual rollback RPC for an owned immutable historical fixture; all rolled back. No live bad content publication occurred. Editor/member/anon private catalog denial and operations draft-null/writes denial are covered.

Intermediate failures and their corrections are explicit in `intermediate-failures.md`. Two cold-dev navigation timeouts and the initial wrong-cwd unit invocation do not count as passing tests; their complete separate logs were not retained, and that limit is recorded. A rate-limit-fixture429 and an owned-signout-rate cleanup mismatch were corrected without changing limits or deleting existing rows; retained run2 evidence proves exact restoration, followed by a fresh completely passing run.

## Exact commands and outputs

All commands ran at repository root unless a cwd is listed. Node for app servers/build runner: `.lumiq-local/node22/node_modules/node/bin/node` (22.23.3). Local DB commands use `DOCKER_HOST=unix:///Users/huangshaotai/.colima/lumiq-platform/docker.sock`.

1. RED units: `npm --prefix related/website exec -- vitest run --root related/website features/account/identity-write.test.ts tests/content-read.test.ts`; `npm --prefix related/admin exec -- vitest run --root related/admin features/catalog/catalog.test.ts`. Full output `unit-website-red.log`, `unit-admin-red.log`; expected failures above.
2. RED browser: `node .lumiq-local/final-fix-runtime.mjs` starts task-owned dev mirrors4281/4282 using unique private limiter salt. `node .lumiq-local/final-fix-browser.mjs red`. Test code copies are retained in evidence; website/admin runtime logs and final red result/owned/before/after JSON retained privately. Main RED result intentionally records failures.
3. SQL: `supabase test db supabase/tests/database/final-fix.test.sql` before and after migration; `sql-red.log`/`sql-green.log`. Migration: `node .lumiq-local/final-fix-migrate.mjs`, executing `supabase migration up --local`; `migration.log`, `migration-{before,after,safety}.json`. SQL RED preceded the final extra positive assertions; all26 final assertions passed.
4. Independent stock builds: `node .lumiq-local/final-fix-build.mjs` prepares the owned verification mirror with its existing separately installed admin/website dependencies. For each app, cwd `.lumiq-local/verification/related/<app>`, execute `npm run build`, `npm run typecheck`, `npm run lint`, with Node22 first in PATH and saved local env. Results in `build-results.json`, `<app>-{build,typecheck,lint}.log`. No original website env/tsconfig/dependencies touched.
5. Focused website, cwd `.lumiq-local/verification/related/website`: `npm exec -- vitest run features/account/service.test.ts features/account/auth-mail.test.ts features/account/identity-write.test.ts tests/content-read.test.ts tests/content-snapshot.test.ts` →67pass. Admin cwd sibling/admin: `npm exec -- vitest run features/catalog/catalog.test.ts features/dashboard/service.test.ts features/content features/media` →76pass. Full logs retained.
6. `node --test scripts/tests/contracts-sync.test.mjs scripts/tests/admin-boundary.test.mjs scripts/tests/local-boundary.test.mjs` →7pass. `node scripts/generate-legacy-media.mjs --check` and `node scripts/sync-platform-contracts.mjs --check` →pass. Fresh `supabase gen types typescript --local` output retained in `database-types.ts`; it differs from existing types only in trailing whitespace. Normalized fresh output equals both byte-identical app copies (`database-types-parity.json`), so no type rewrite was needed.
7. GREEN browser: `node .lumiq-local/final-fix-runtime.mjs --stock`, then `node .lumiq-local/final-fix-browser.mjs green`; actual verified stock apps4281/4282, final14behavior passes + cleanup equality. `browser-green-console.log`, `browser-green-results.json`, retained harness copy and private owned/baseline records. `final-fix-cleanup-rate.mjs` documents the prior exact owned row cleanup, followed by a fresh rerun with registered account-ID hashes.
8. Delivery: `node .lumiq-local/final-fix-refresh.mjs` backs up owned preview source/artifacts, stops only owned supervisor, refreshes source and copies successful stock artifacts from verification (same independent package locks), restarts via `scripts/local-preview.mjs start`. It never overwrites preview-config/credentials. `delivery-refresh.log/json`, `delivery-before/after.json`. A restoration fallback exists but was not needed. Temporary focused runtime stopped; delivered supervisor6343 is running. Original8575/14279/55819 survived;4211/4270/4240/4241/4242 all200.
9. Final read-only health check imported `assertTestBoundary()` from `scripts/platform/local.mjs`: it refused delivered data as expected without any fixture stage. Fetches returned website200/admin200/anonymous-profile401 with `private, no-store, max-age=0`; `final-health.json` records the result.
10. `node .lumiq-local/final-fix-provenance.mjs` records every tracked/untracked nonignored input hash and verifies823 production files equal root, verified build and delivered preview; excludes tests/tool configs/QA screenshots/env examples from production parity. `source-input.json`, `source-provenance.log`; first overly broad nonruntime inventory retained separately. `git diff --check` passed. All65 Ruling lines with costs exactly match committed `docs/admin/decisions.md` in chronological order.

## Data/runtime safety and provenance

Only uniquely owned temporary Auth users/staff profiles and digest-addressed rate rows were created by browser tests; UUID/email/time and protected baseline were written privately before mutation. Each run uses finally cleanup and compares existing Auth/profiles/staff/drafts/releases/publication/catalog/commerce/privacy/audit-count/rate rows. No external mail was sent; no Mailpit messages deleted. No order/waitlist/payment mutation, broad verifier mutable stage, reseed/reset or global catalog/retention edit ran. SQL assertions include a rollback RPC only within the final rolled-back transaction; no external reader sees its temporary pointer change.

The one cleanup discrepancy was a newly owned A signout digest; `browser-green-run2-cleanup-correction.json` plus corrected-after proves restoration. Final fresh browser run and delivery refresh protected baseline compare equal. Saved private config and credentials byte hashes are unchanged and both remain0600. SUPABASE_URL remains the saved local URL. Default verifier refusal is unchanged and tested; original three preview processes remain.

Production inputs SHA256: `a3d01dd700f26bd991601a51b78babf444986a3a67bdfe3af25fa9bb61e9fb5a` across823 files. All input SHA256 at capture: `a7291ae0c2651c4b717c4a9f5d7e97da57cc5387ccc238da85e744c1d7994975` (docs/tests included). Per-file hashes retained; builds were made from these unchanged production inputs. Website stock BUILD_ID `a1VuKlgaQkQD7shynMfFN`, admin `cDjXlymX-4TP6rjZSWp2e`, identical in verified and delivered copies. Tests/docs were updated after the builds where noted; no production source changed after those builds. Private baseline/source evidence is ignored and not committed.

## Changed files

- `contracts/content-legacy-media.ts`
- `contracts/content-validation.ts`
- `contracts/core.ts`
- `docs/admin/acceptance.md`
- `docs/admin/decisions.md`
- `docs/admin/deployment.md`
- `docs/admin/operations.md`
- `docs/admin/security-status.md`
- `related/admin/app/(protected)/catalog/page.tsx`
- `related/admin/features/catalog/CatalogEditor.tsx`
- `related/admin/features/catalog/catalog.test.ts`
- `related/admin/features/catalog/service.ts`
- `related/admin/features/content/schema.test.ts`
- `related/admin/features/content/validation-attestation.ts`
- `related/admin/features/dashboard/Dashboard.tsx`
- `related/admin/features/shell/AdminShell.tsx`
- `related/admin/lib/generated/platform/content-legacy-media.ts`
- `related/admin/lib/generated/platform/content-validation.ts`
- `related/admin/lib/generated/platform/core.ts`
- `related/website/app/[locale]/reset-password/page.tsx`
- `related/website/app/api/auth/reset/route.ts`
- `related/website/components/MembersArea.tsx`
- `related/website/features/account/AccountPanel.tsx`
- `related/website/features/account/ResetPasswordForm.tsx`
- `related/website/features/account/identity-binding.ts`
- `related/website/features/account/identity-write.test.ts`
- `related/website/features/account/service.ts`
- `related/website/features/account/session-event.ts`
- `related/website/features/account/use-account-identity.ts`
- `related/website/lib/content/read.ts`
- `related/website/lib/generated/platform/content-legacy-media.ts`
- `related/website/lib/generated/platform/content-validation.ts`
- `related/website/lib/generated/platform/core.ts`
- `related/website/tests/content-read.test.ts`
- `related/website/tests/e2e/account-auth.spec.ts`
- `scripts/generate-legacy-media.mjs`
- `supabase/migrations/20261020223000_final_review_boundaries.sql`
- `supabase/tests/database/content.test.sql`
- `supabase/tests/database/final-fix.test.sql`
- `supabase/tests/database/media.test.sql`

## Limits / remaining owner work

No broader suite or original mutable account/catalog fixture was rerun. Older SQL fixtures were updated only for the new policy-version literal; they were not executed against delivered data. No uninterrupted full verifier PASS, GitHub CI, new dependency advisory audit, production migration/backup qualification, SMTP, paid cloud, payment, push/merge/deploy or real-device/hardware claim. Existing22 Declined rulings and all prior operational/security qualifications remain. The genuine earlier cold-dev failures and wrong-cwd attempt have summary/transcript evidence rather than separately retained full logs. The root's fresh scoped rereview is still required; this report does not preempt it.

## Commit

`920d7d69ff5365e48f602154d62b0fee94e98a2c` — `fix: bind account writes and close final admin review gaps`. 40 scoped files. Working tree clean after commit. No push/merge/deploy.
