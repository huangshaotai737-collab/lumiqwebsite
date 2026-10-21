# Visual Content Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add click-to-edit, ephemeral live website preview and separate background controls without changing publication or business behavior.
**Architecture:** Existing staff-authenticated preview route plus exact-origin/channel postMessage. Client preview renderers reuse original components; three server renderers are mechanically generated and checked for source equality. Existing draft operations remain authoritative.
**Tech Stack:** Existing Next.js, React, next-intl, Vitest and Playwright; no new dependency or migration.
**Spec:** docs/superpowers/specs/2026-10-21-visual-content-editor-design.md

## Global Constraints
- No database reset, publication, remote push, payment or business endpoint changes.
- Keep all existing fields, role restrictions, optimistic versions and conflict recovery.
- Temporary snapshots stay in memory. Messages require exact configured origin, frame source and channel.
- Preserve original local previews and private configuration; verify in owned mirrors.

## Review Focus
- Duplicate text must offer candidates instead of selecting the wrong field.
- Late frame messages or stale renders must not overwrite the current page/language/input.
- Invalid intermediate input and failed/expired preview must preserve the editor state.
- Preview forms/cart must not mutate business data or visitor local storage.
- Backgrounds and shared fields must retain their current usage restrictions.

### Task 1: Editor selection and protocol
**Files:** contracts/visual-editor.ts; generated contract copies; admin and website visual-editor tests.
**Interfaces:** typed channel messages; visible field candidates; text/media normalization; allowed preview paths.
- [ ] Write and observe failing tests for invalid origins/channels, text ambiguity, rich text, locale/global filtering, background exclusion and image optimizer URLs.
- [ ] Implement pure protocol/selection helpers and sync generated copies.
- [ ] Run unit tests green.

### Task 2: Private live website canvas
**Files:** website preview route, components/content/visual/*, generator script, package prebuild, .env.example, local preview server env.
**Interfaces:** authenticated iframe receives snapshot + mode and returns ready/select/navigate/status.
- [ ] Add generator/source synchronization tests and preview request boundary tests, observe red.
- [ ] Reuse renderers and styles; generate only Home/Story/Contact client entries from exact public source. Implement memory-only frame provider and capture guards.
- [ ] Validate staff/parent origin and allowlisted page at server boundary; fail closed when not configured.
- [ ] Run tests, typecheck and browser probes for live server/client copy and no business writes.

### Task 3: Visual editor workspace
**Files:** admin ContentEditor, VisualPreview, visual-editor.css, history helper/tests.
**Interfaces:** snapshot and existing change callback; select callback to original FieldControl; no new save/publish API.
- [ ] Observe failing tests/probes for undo/redo, page changes, desktop scaling, selected field and inaccessible preview states.
- [ ] Add device/language/page/mode toolbar, scaled iframe, selected field and ambiguity chooser; separate backgrounds and complete existing fields under details.
- [ ] Retain all operation locks/errors/conflicts and add dirty leave warning.
- [ ] Run targeted tests, then both app checks and isolated browser regression.

### Task 4: Review and local delivery
- [ ] Independently review final diff against all unchanged API/role boundaries and fix confirmed issues.
- [ ] Capture desktop/mobile first views, run regression of existing admin pages and public website.
- [ ] Refresh only owned local preview build, verify configuration/data and original processes preserved.
- [ ] Document outcomes/limits and commit locally; no push or cloud deployment.
