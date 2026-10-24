# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. Read it fully before editing anything.

## 1. Aim

Priabora is a personal chemistry study and reference suite. Max, a first-year chemistry degree student, built it for daily use throughout the degree, and it is shared with a small trusted group of classmates.

- Max has no coding background. Claude writes and applies all code changes, so explain changes in plain language, keep summaries short, and flag anything Max must do outside the editor.
- Max prefers manually sourced data (e.g. PubChem). Do not add AI auto-population of Periodic Table element properties. All PT fields are click-to-edit.

## 2. Commands

- `npm run dev`: Vite dev server with HMR
- `npm run build`: production build to `dist/`. Also use it as the validation check (see §5).
- `npm run lint`: ESLint (flat config: `@eslint/js` recommended + react-hooks + react-refresh)
- `npm run preview`: serve the built `dist/`

There is no test suite. Plain JavaScript/JSX, no TypeScript. `.env` must define `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. It is gitignored and must stay that way.

## 3. Stack and architecture

- React 19 + Vite SPA. **All logic lives in one file, [src/App.jsx](src/App.jsx).** Do not split it up unless asked. `main.jsx` mounts `App`.
- Stale files that nothing imports: `src/App (1).jsx`, `src/Apptest.jsx`, `src/App.css`. Don't edit them by mistake. `src/priabora-backup-*.json` is a sample export from the app's backup feature.
- Inline styles only, dark theme only. No CSS files, no Tailwind, no icon libraries (nav icons are Unicode glyphs). Global CSS (fonts, keyframes, scrollbars) is injected by the `GlobalStyles` component.
- Supabase is the cloud store, with localStorage as an instant local cache.
- Hosted on Netlify, which auto-deploys from GitHub (`sprout-mex/priabora`) on every push.

### Layout of App.jsx (top to bottom)
1. Supabase client, `GlobalStyles`, palette `C`, font constants, category/status constants, `ADMIN_LOGIN` / `ADMIN_DISPLAY`.
2. Hooks: `useIsMobile`, `useUsername`, the storage hooks, `useSaveStatus`.
3. Static `ELEMENTS` data and the `EGRID` position lookup. `entriesMentionedIn` and `elementsMentionedIn` find cross-references by matching text.
4. Backup export/import, `callClaude`, the activity log helpers, and file/image helpers.
5. UI primitives, then the modals, then the feature modules: `PeriodicTableModule`, `DatabaseModule`, `SpectrumModule`, `NotebookModule`, `LabReportsModule`.
6. `App`: switches modules with `tab` state (no router). It passes `navTarget {tab,id}` and `onNavigate` down so linked entries can jump to each other across modules.

### Modules
Periodic Table, Reference DB, Lab Reports, Notebook and Spectrum Analyser. Each one follows the same pattern: list/grid view → click an item → detail view (a bottom `Sheet` on mobile, a side panel on desktop).

### Key mechanisms
- **Storage hooks.** Both hooks keep localStorage as a cache and treat Supabase as the source of truth. On first mount, if Supabase is empty, the local cache is pushed up as a one-time migration. Saves update the global status that `SaveIndicator` displays.
  - `useLS(key, init)`: single keyed values, one row per key in `priabora_data`. Used for categories and subcategories, `elem-note-<n>`, `elem-override-<n>`, and the admin last-seen timestamp.
  - `useCloudCollection(collection, seed)`: arrays of entries (`db`, `reports`, `notes`, `spectra-meta`). Each item is one row in `priabora_items`, keyed by `(collection, item_id)`. On every set it diffs the previous and next arrays and only upserts or deletes the changed items. Every item needs a stable `id` (new entries use `Date.now()`). The localStorage key is `priabora-<collection>`.
  - Backup import and export include only keys that pass `isPriaboraKey` (prefixes `priabora-`, `elem-note-`, `elem-override-`). `COLLECTION_KEYS` maps array keys back to collections. **If you add a new persisted key or collection, update both.**
- **Identity.** `useUsername` and `NameGate` give each browser a local display name stored in localStorage (`priabora-username`) and never synced. The admin types the secret `ADMIN_LOGIN` but appears everywhere as `ADMIN_DISPLAY`. In `App`, `loginName` is the raw stored value and `username` is what gets displayed and attributed. Never show or log `loginName` for the admin. `ADMIN_DISPLAY` is reserved, so `NameGate` refuses it and a stored copy sends the user back to the prompt. This is a soft check, not real auth: the login is visible in the built JavaScript. Entries carry `createdBy` and `lockedBy`. Locked entries can only be edited, linked or deleted by the admin.
- **Activity log.** `logActivity()` writes add/edit/delete/lock/unlock events to `priabora_activity_log` (fire-and-forget). The admin sees `AdminChangeLogModal` on sign-in with everything since their last visit.
- **Linking.** Links between modules and the Periodic Table go both ways. `LinkSuggestModal` offers opt-in suggestions at save time (nothing links automatically) as well as manual search linking. Element field edits trigger it too (`offerLinks` in `ElementPanel`). `ElementMentionPills` is a live, read-only scan of the text.
  - Links are stored on whichever side created them: `linkedDbIds` / `linkedReportIds` / `linkedNoteIds` / `linkedElements` on entries, and the shared `priabora-elem-links` value (via `ElementsContext`) for links made from an element.
  - The **Links tab** (`LinksBrowser`, used by elements and DB entries) gathers stored links from both directions as "Linked". Live text mentions show as "Suggested" with Link / Ignore buttons. Ignored ones are kept in `entry.ignoredLinks`, or in `ignored` in the element's links, as `"type:id"` keys.
- **Annotations.** `useAnnotations` and `AnnotatableText` (via `buildAnnotatedSegments`) let users select text and attach shared notes (`priabora_annotations`).
- **Completion status (DB and Notebook).** Statuses are In Progress, On Hold and Complete, handled by `StatusPicker`, `StatusPill`, `statusBorderStyle`, `STATUS_SIDES`, `STATUS_OPACITY`, `STATUS_BG_ALPHA` and `STATUS_HOVER_ALPHA`. In the DB and Notebook list views, the accent bar is the status indicator.
- **Customisable fields (DB and Periodic Table).** Shared field lists `priabora-db-fields` and `priabora-pt-fields` (`DEFAULT_DB_FIELDS` / `DEFAULT_PT_FIELDS`) define the property boxes and text sections. Each field can be `standard` (on by default). The DB stores its choice in `entry.fields`: an array (customised), `"standard"`, or missing (legacy layout, see `entryFieldIds`). An element stores `override.fields` only once it has been customised. Both use the shared `FieldPicker`. Hiding a field never deletes its value, and there is deliberately no field delete; duplicate names are reused instead.
- **Other names ("aka").** DB entries keep `entry.aliases`. Element aliases live in one `priabora-elem-aliases` value `{[n]: [...]}`, owned by `App` and shared through `ElemAliasesContext`, so every module's `elementsMentionedIn(elemAliases, ...)` sees them. Aliases count for search, link suggestions and mention pills; names shorter than `MIN_ALIAS_MATCH` are skipped when scanning text. The DB edit form warns, without blocking, when a name clashes with an existing entry.
- **Categories.** The DB and Notebook share one store through `useLS("priabora-categories", DEFAULT_CATEGORIES)`, so they stay in sync.
- **Sub/superscript typing.** `SUP_MAP` and `SUB_MAP` with the Ctrl/Cmd+Shift+= and Ctrl/Cmd+Shift+- toggles, handled by `handleScriptKeyDown`. It is wired into `Input`, `Textarea`, `EditableText` and `DataTableEditor`. Use these components rather than raw inputs.
- **AI calls.** `callClaude(system, messages)` POSTs directly to `api.anthropic.com` with model `claude-sonnet-4-20250514`. The Spectrum Analyser expects strict JSON back and parses it with `parseJSON()`, which strips code fences. Notebook summaries and report reviews use the plain-text reply.
- **Photos.** Images are resized client-side, then uploaded to the Supabase storage bucket `photos`.

## 4. Connected services

| Service | Details |
|---|---|
| GitHub | `sprout-mex/priabora`. Push to deploy. |
| Netlify | Auto-deploys on push. Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. |
| Supabase | Project `maktaba`, org `priabora`. Tables: `priabora_data`, `priabora_items`, `priabora_activity_log`, `priabora_annotations`. Storage bucket: `photos`. The anon key has full read/write (trusted-group model). |
| Anthropic API | Used by `callClaude()` for Spectrum analysis, notebook summaries and report reviews. |

Never print or commit secret keys.

## 5. Development process

- Make one focused change at a time. Batching several changes that are confirmed to work into one push is fine.
- Edit `src/App.jsx` directly in the workspace. Earlier chat sessions delivered the whole file by copy and paste, and that no longer applies.
- **Validate before finishing** with `npm run build` or a Babel parse of `src/App.jsx`. Past sessions caught missing closing tags and accidentally deleted components this way.
- Show Max the result, and Max commits (`git add . && git commit -m "..." && git push`). Only run git commands if asked.
- Proactively flag infrastructure steps whenever a change needs one: a new Supabase table (give the SQL and RLS policies), a new storage bucket, a new env var, or a storage key rename.
- Expect iterative visual refinement. Max clarifies design intent step by step, so expect several correction rounds on cosmetic work.
- Max may do trivial label or key swaps in arrays himself.

## 6. Style rules (apply to any cosmetic change)

Reuse what exists. Do not introduce new fonts, hex values or radii ad hoc.

- **Fonts:** `serif` = `'Lora', serif` for headings, titles and entry names (weight 600–700). `mono` = `'Georgia', serif` for everything else. The variable is named `mono` but is not monospace. IBM Plex Mono is loaded but unused. Georgia vs Plex Mono is an open evaluation, so don't change it without asking.
- **Palette:** use the `C` object only (bg, surface, panel, border, borderHi, text, muted, faint, blue, green, pink, yellow, orange, purple, teal, red).
- **Tints** use hex alpha suffixes: `0a` faint wash → `12` soft fill → `1a` badge/button → `20`/`25` active → `30` hover → `33`/`35`/`40` borders → `55` strong border/glow.
- **Accents:** orange is the brand colour ("Priabora", active nav). Teal marks link-related UI. Each module claims one accent colour for its SLabels, left borders and active states. Pick one accent for any new module.
- **Radii:** 3–4px for tiles and pills, 5–7px for small cards and buttons, 8–10px for panels and cards, 12px for modals, 16px for the top corners of the mobile sheet.
- **Layout:** the mobile breakpoint is `useIsMobile()` (<768px), which switches to `Sheet` and `BottomTabBar`. Desktop uses a 218px sidebar plus either a right detail panel (PT 290px, DB 340px) or an overlay panel (Notebook 340px, Reports 420px). Gaps are 8–16px and card padding is 12–16px.
- **Primitives to reuse:** `Pill`, `SLabel`, `Card`, `Btn`, `Input`, `Textarea`, `EditableText`, `Sheet`, `LinkPickerModal`, `LinkSuggestModal`, `ChipPicker`, `StatusPicker`, `StatusPill`, `TwoToneTitle`, `CompoundPropsGrid`, `LockBadge`, `LockToggleBtn`, `ElementMentionPills`, `AnnotatableText`.
- **Loading state:** a pulsing ◉ plus "…", using the `pulse` keyframe.
- The full reference is `priabora-style-guide.md`. It is not in this repo, so ask Max for it before major cosmetic work.

## 7. Gotchas (hard-won)

- **Nested folder trap.** The project is at `C:\Users\max\priabora\priabora`. The outer folder `C:\Users\max\priabora` has a stray `src/App.jsx` that Vite does not serve. If a change doesn't appear, check `pwd`, run `(Resolve-Path src\App.jsx).Path`, check `LastWriteTime`, then hard-refresh with Ctrl+Shift+R.
- **Vite env vars are baked in at build time.** Changing a `VITE_` variable in Netlify needs a fresh git push, not just a redeploy.
- **Supabase race condition.** An async fetch that resolves after a local write can overwrite good data with a stale cloud value. Both storage hooks guard against this with `dirtyRef`, and `useLS` also uses empty-object detection. Keep these guards when you edit the hooks.
- **Single source of truth.** Never let two components own the same localStorage key independently. This has caused dual-state bugs before. `App` is the only owner of the `db`, `reports`, `notes` and `spectra-meta` collections, and modules receive the items and setters as props. Never call `useCloudCollection` for these inside a module.
- **Scripted edits and special characters.** `App.jsx` is full of non-ASCII text (°, ³, —, emoji). `perl -pi` with a non-ASCII replacement once double-encoded every such character in the file, and the build still passed. Prefer the Edit tool. After any scripted edit, compare the file's non-ASCII characters with `git show HEAD:src/App.jsx`.
- **localStorage keys** are `priabora-*`, `elem-note-{n}` and `elem-override-{n}`. The older style guide mentions `chemlab-*`, which is outdated. Do not rename keys without a migration step, because a rename would orphan saved data.
- **Working-copy contamination.** Foreign functions have appeared in a working copy of App.jsx before. If the file looks wrong, diff it against the last commit (`git diff`) and restore from the clean version.

## 8. Known issues and roadmap

- Notebook and Lab Reports still need the Links tab (planned next).

- `callClaude()` calls the Anthropic API directly from the browser with no API key or `anthropic-version` header, so it fails on the hosted site. The planned fix is a Netlify Function serverless proxy.
- Max is considering removing the AI features from the Spectrum Analyser to cut API costs. This isn't decided, so ask first.
- Annotations still need edit-in-place for existing notes and a central "all annotations" view.
