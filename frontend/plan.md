# SolidJS to React SPA Rewrite Plan

## 1. Purpose

Rewrite the existing SolidJS frontend as an idiomatic React SPA while preserving its user-visible behavior, API
contract, information architecture, responsive layout, and visual character.

This is a rewrite, not a redesign. The implementation does not need to retain every file boundary or translate line by
line, but the result should remain recognizably the same application:

- `/login` is the guest login page.
- `/` is the authenticated shopping-items page.
- `/stores` is authenticated store and section administration.
- Cookie-based authentication, endpoint paths, methods, payloads, query keys, and mutation behavior remain compatible
  with the existing backend.
- Desktop and mobile navigation, sticky list headings, dialogs, counts, drag overlays, error feedback, and mobile
  safe-area handling remain close to the existing experience.
- Components should use React and shadcn/ui conventions rather than emulating Solid or DaisyUI.

Do not modify the backend as part of this rewrite.

## 2. Fixed Architecture Decisions

### Runtime and build

- React 19 at the latest stable version compatible with the selected toolchain.
- TypeScript at the latest stable version.
- Vite SPA build using the latest stable `vite` and `@vitejs/plugin-react`.
- npm remains the package manager. Update and commit `package-lock.json` with `package.json`.
- Tailwind CSS 4 remains the styling engine, using the current official Vite integration recommended by shadcn/ui.
- Keep the existing Vite development server behavior: host `0.0.0.0`, port `3000`, and `/api` proxy to
  `http://localhost:8000`.
- Keep `build.target: "esnext"` unless an explicit deployment browser-support requirement says otherwise.
- Keep the current public manifest, icons, HTML title, `viewport-fit=cover`, `interactive-widget=resizes-content`, and
  root/noscript markup.

### Routing: use React Router

Use the latest stable React Router in declarative SPA mode with `BrowserRouter`, route elements, layout routes,
`Outlet`, `Navigate`, `Link`, and `NavLink`.

Rationale:

- The application has only three static routes and no route params, validated search params, route-level data
  dependencies, SSR, or complex nested loading.
- TanStack Query already owns server state and caching. A second router-level cache would not add value here.
- React Router is the smaller migration and has direct equivalents for the current route guards and authenticated
  layout.
- TanStack Router's strongest advantages, such as generated type-safe route trees, typed params/search, loader context,
  and preloading, are not exercised by this app.

Reconsider TanStack Router only if the product is expected soon to gain many parameterized routes, substantial URL-owned
state, route-level prefetching, or a need for compile-time-safe navigation. Do not introduce TanStack Start; this
project must remain a client-rendered Vite SPA.

### Server state

- Keep TanStack Query and replace Solid bindings with the latest stable `@tanstack/react-query` and matching React Query
  devtools.
- Preserve the existing query key shapes initially. Centralize query keys and reusable query options only where doing so
  makes invalidation less error-prone.
- Do not add Redux, Zustand, TanStack Store, or another global state library. TanStack Query plus local React
  state/reducers are sufficient.
- Create the `QueryClient` exactly once and keep it stable across React renders.
- Keep query devtools development-only.

### Drag and drop

- Use the current, non-legacy dnd-kit React packages and APIs, presently `@dnd-kit/react` and `@dnd-kit/helpers`, at
  their latest compatible stable versions.
- Follow the current documentation at `https://dndkit.com/react/`; do not copy examples from the legacy `@dnd-kit/core`
  documentation unless the chosen installed version explicitly requires the legacy packages.
- Support pointer, touch, and keyboard operation. Preserve handle-only drag activation and `touch-action: none` behavior
  on drag handles.
- Keep item dragging and section dragging as separate drag/drop contexts because they have different state and
  persistence semantics.

### UI

- Remove DaisyUI and build the interface from shadcn/ui primitives plus local application components.
- Initialize shadcn/ui with its CLI in the existing Vite project. Install every shadcn component through the CLI; do not
  hand-create approximations under `src/components/ui`.
- Prefer the mature Radix-backed shadcn primitives unless the CLI's current recommended default has changed and there is
  a concrete compatibility reason to use another base.
- Start with the shadcn components needed by the known UI: `alert`, `alert-dialog`, `avatar`, `badge`, `button`,
  `checkbox`, `collapsible`, `dialog`, `dropdown-menu`, `input`, `label`, `separator`, `sonner`, and `spinner`. Install
  only components actually used.
- Treat generated `src/components/ui/*` files as vendored design-system primitives. Avoid editing them. Customize the
  app through CSS theme variables, standard component props/variants, and classes in application components.
- Use `lucide-react` for icons and shadcn Sonner for toasts.
- Retain Inter Variable unless visual comparison demonstrates a reason to change it.
- Preserve the current emerald-like green identity by setting shadcn CSS variables in `src/index.css`; do not retain
  DaisyUI theme declarations.
- Do not add a form library for the current simple forms. Use native form submission, browser validation, controlled
  dialog-open state, and refs where focus/reset behavior requires them.

## 3. Current Application Contract

Agents must inspect the current implementation before replacing it. The existing source is the behavioral specification
where this plan is not explicit.

### Important source files

- `src/index.tsx`: entry point and route tree.
- `src/app.tsx`: root providers and authenticated layout.
- `src/api.ts`: shared fetch/error behavior.
- `src/providers/auth.tsx`: current-user query and route guards.
- `src/providers/query-client.tsx`: Query client and global 401 behavior.
- `src/pages/home.tsx`: item hierarchy and multi-container drag/drop.
- `src/pages/login.tsx`: login form behavior.
- `src/pages/stores.tsx`: store administration composition.
- `src/components/items/add-item.tsx`: shared add-item dialog and target state.
- `src/components/items/item-checker.tsx`: reversible delayed-check timers.
- `src/components/items/sortable-item.tsx`: item row behavior and drag handle.
- `src/components/store/store-item.tsx`: lazy section queries and section reorder.
- `src/components/modify-dialog.tsx`: create/rename form lifecycle.
- `src/components/delete-dialog.tsx`: delete confirmation lifecycle.
- `src/components/navbar.tsx`: responsive navigation and logout.
- `src/data/items.ts` and `src/data/stores.ts`: API data shapes and count helpers.
- `src/index.css`, `index.html`, and `public/*`: visual baseline and installable-app metadata.

### Routes

| Path      | Access        | Screen              |
| --------- | ------------- | ------------------- |
| `/login`  | Guest         | Login               |
| `/`       | Authenticated | Items               |
| `/stores` | Authenticated | Stores and sections |
| `*`       | Any           | 404                 |

All routes should be under the Query and toast providers. The authenticated route layout should render navigation and
the constrained main content area only after authentication is resolved. An authenticated visitor to `/login` should be
redirected to `/` without flashing the login form.

### API wrapper invariants

Retain one shared typed fetch wrapper with these semantics:

- Prefix string paths with `/api`.
- Always send `credentials: "include"`.
- Throw a dedicated `UnauthorizedError` on HTTP 401.
- Throw `ApiError` for other non-success responses.
- Parse successful JSON responses only when the response content type is JSON; otherwise return `null`.
- Preserve request headers and bodies supplied by callers.
- Improve the wrapper to accept/forward `AbortSignal` where TanStack Query supplies one, without changing endpoint
  behavior.

Do not invent a token store or add local/session storage. Authentication is cookie/session based.

### Query and mutation contract

| Query key                         | Request                             | Notes                                                 |
| --------------------------------- | ----------------------------------- | ----------------------------------------------------- |
| `['auth', 'me']`                  | `GET /api/auth/me`                  | Five-minute stale time, no retry, 401 maps to no user |
| `['items']`                       | `GET /api/items`                    | Full nested shopping hierarchy                        |
| `['stores']`                      | `GET /api/stores`                   | Store administration list                             |
| `['stores', 'sections', storeId]` | `GET /api/stores/:storeId/sections` | Enabled only after expansion                          |

| Action           | Request                                                            | Required result                                         |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| Login            | `POST /api/auth/login`, `{ username, password, auth_type: 'web' }` | Refetch current user, navigate to `/`                   |
| Logout           | `POST /api/auth/logout`                                            | Refetch current user, navigate to `/login`              |
| Add item         | `POST /api/items`, name plus optional `store_id`/`section_id`      | Invalidate items                                        |
| Check item       | `PUT /api/items/:id/checked`                                       | Invalidate items                                        |
| Move item        | `PUT /api/items/:id/move`, `{ store_id, section_id, index }`       | Invalidate items; restore server-derived order on error |
| Organize store   | `POST /api/stores/:id/organize`                                    | Invalidate items                                        |
| Add store        | `POST /api/stores`                                                 | Invalidate stores                                       |
| Rename store     | `PUT /api/stores/:id`                                              | Invalidate stores                                       |
| Delete store     | `DELETE /api/stores/:id`                                           | Invalidate stores                                       |
| Add section      | `POST /api/stores/:id/sections`                                    | Invalidate that store's sections                        |
| Reorder sections | `PUT /api/stores/:id/sections/reorder`, `{ ids }`                  | Optimistic update, rollback on error, then invalidate   |
| Rename section   | `PUT /api/sections/:id`                                            | Invalidate that store's sections                        |
| Delete section   | `DELETE /api/sections/:id`                                         | Invalidate that store's sections                        |

Preserve the existing global unauthorized behavior: a 401 from a protected query or mutation clears/invalidates stale
protected state and redirects to `/login`. Avoid redirect loops when the current-user query itself returns 401.

## 4. Target Source Shape

Keep roughly the current domain grouping. This is a guide, not a requirement to create empty abstraction layers.

```text
src/
  main.tsx
  app.tsx
  index.css
  api.ts
  router.tsx
  components/
    ui/                    # shadcn CLI output only
    navigation.tsx
    app-error.tsx
    items/
      add-item-dialog.tsx
      item-checker-provider.tsx
      item-row.tsx
      items-dnd.tsx        # only if extraction improves readability
    stores/
      store-dialogs.tsx    # split if this becomes unwieldy
      store-item.tsx
      section-list.tsx
  data/
    items.ts
    stores.ts
    query-keys.ts          # optional but recommended
  pages/
    items-page.tsx
    login-page.tsx
    stores-page.tsx
    not-found-page.tsx
  providers/
    auth-provider.tsx
    query-provider.tsx
  lib/
    utils.ts
```

Guidelines:

- Preserve domain names (`items`, `stores`, `sections`, `auth`) and avoid generic abstractions such as `BaseManager` or
  configuration-driven CRUD for this small app.
- Keep `src/components/ui` limited to shadcn-installed code.
- Keep API data types close to their domain helpers.
- Extract pure item-container functions from rendering so movement semantics can be unit tested.
- Use a reducer for the ordered `Record<containerId, itemId[]>` state. A single reducer action must atomically remove
  and insert an item.
- Context is appropriate for the shared add-item dialog target and delayed-check manager. Do not place all page state
  into one broad context.
- Compute simple derived values during render. Use `useMemo` only for genuinely costly or identity-sensitive values such
  as the item lookup map or a provider value; do not mechanically translate every Solid `createMemo`.
- Use effects only to synchronize with external systems. Do not copy Solid effects verbatim.
- Keep hooks unconditional. Render distinct sortable-row and drag-overlay components if their hook needs differ.

## 5. Agent Execution Model

Use one orchestrator agent to sequence work and own integration. Specialized agents may work in parallel only when their
file ownership does not overlap. Every agent must read this plan and the current files relevant to its task before
editing.

### Shared rules for every agent

1. Check the worktree first and do not revert unrelated user or agent changes.
2. Use current official documentation for installed package versions; do not rely on remembered pre-2025 APIs.
3. Install shadcn primitives with `npx shadcn@latest add ...`; never synthesize UI primitive files manually.
4. Keep endpoint paths, request shapes, and query keys unchanged unless this plan explicitly allows a change.
5. Do not leave both Solid and React implementations in the production bundle.
6. Do not add compatibility wrappers that are unused after the rewrite.
7. Keep each phase buildable or clearly coordinate any short non-buildable window with the orchestrator.
8. Run the phase's checks before handoff and report changed files, commands run, failures, and remaining risks.
9. Do not weaken TypeScript, ESLint, or tests to make migration errors disappear.
10. Do not redesign the product, add dark mode, persist client state, add SSR, or introduce unrelated features.

### Recommended agent roles

| Agent                   | Owns                                                                  | Must not independently change           |
| ----------------------- | --------------------------------------------------------------------- | --------------------------------------- |
| Orchestrator/foundation | Package and build configuration, shadcn init, global CSS, entry point | Domain behavior without coordinating    |
| Data/auth/router        | API, Query provider, auth provider, router, auth tests                | Item/store UI and DnD                   |
| UI migration            | Navigation, login, dialogs, stores page, item presentation            | Toolchain and DnD algorithms            |
| DnD specialist          | Item reducer/helpers, item DnD, section DnD, related tests            | Auth/router and generated shadcn files  |
| QA/accessibility        | Fixtures, tests, screenshots, accessibility review                    | Production behavior except agreed fixes |

If agents do not have isolated worktrees, run phases sequentially. In particular, only one agent may run shadcn CLI or
dependency installation at a time because those commands overlap `package.json`, the lockfile, CSS, and generated UI
files.

## 6. Migration Phases

### Phase 0: Record the baseline

Goal: create an objective reference before changing runtime code.

Tasks:

1. Run and record the existing checks: `npm run tsc`, `npm run lint`, `npm run prettier:check`, and `npm run build`.
2. Run the Solid app against a usable backend or deterministic intercepted API fixtures.
3. Capture screenshots at representative desktop and mobile widths for login, items, stores collapsed, and stores
   expanded.
4. Record short videos or screenshots of item reorder, cross-container movement, empty-container drop, section reorder,
   the add-item dialog, and delete confirmation.
5. Record the browser requests for every endpoint in the contract table, including omitted optional IDs versus explicit
   null values.
6. Note loading, empty, error, and mutation-pending states.
7. Do not commit generated `dist` output.

Exit criteria:

- Baseline checks and known pre-existing failures are documented.
- Visual references and API fixtures are available to the rewrite agents.
- Any behavior that conflicts with this plan is escalated before implementation.

### Phase 1: Replace framework and toolchain foundations

Goal: establish a minimal React/Vite/shadcn app before migrating domain behavior.

Tasks:

1. Replace Solid runtime/tooling dependencies with latest compatible stable React dependencies.
2. Upgrade existing retained dependencies to latest compatible stable releases. Use `npm outdated` after installation
   and explain any intentionally non-latest package.
3. Remove `solid-js`, `@solidjs/router`, `@tanstack/solid-query`, `@tanstack/solid-query-devtools`,
   `@thisbeyond/solid-dnd`, `solid-toast`, `lucide-solid`, `solid-devtools`, `vite-plugin-solid`, `eslint-plugin-solid`,
   and DaisyUI once no longer used.
4. Install React, React DOM, React Router, React Query and devtools, current dnd-kit React packages, `lucide-react`, and
   required shadcn dependencies.
5. Replace the Solid Vite plugins with the React plugin and Tailwind's current Vite plugin if required by current shadcn
   guidance. Preserve server/proxy settings.
6. Configure the `@/*` alias consistently in TypeScript and Vite because shadcn uses it.
7. Configure TypeScript for React JSX and strict checking. Retain no-emit and bundler resolution.
8. Replace Solid ESLint rules with current React, React Hooks, React Refresh, TypeScript strict, and TanStack Query
   recommended-strict flat configs where compatible. Keep ESLint 10 only if every selected plugin declares compatibility;
   otherwise use the newest mutually compatible stable versions and document the constraint.
9. Keep Prettier and its Tailwind plugin at compatible latest versions.
10. Initialize shadcn/ui through the CLI in the existing project, with CSS variables enabled and an accessible primitive
    base. Review `components.json` into source control.
11. Install the actual primitive list through the shadcn CLI.
12. Build a minimal `main.tsx` with `createRoot` and `<StrictMode>`, root providers, and a temporary route shell.
13. Remove Solid-specific module declarations and imports if no longer needed.

Do not manually pin the version numbers recorded when this plan was written. Resolve latest stable versions at execution
time and commit exact resolutions through the lockfile.

Exit criteria:

- A React SPA starts and builds.
- `components.json` correctly identifies Vite, Tailwind 4, aliases, icon library, and primitive base.
- No Solid or DaisyUI package is used by the React entry path.
- TypeScript, lint, formatting, and build commands pass for the foundation.

### Phase 2: Migrate API, Query, auth, and routing

Goal: make route access and server-state infrastructure correct before migrating feature pages.

Tasks:

1. Port `api.ts` without changing its observable error/auth behavior; add signal forwarding.
2. Create one stable `QueryClient` with global query and mutation 401 handling.
3. Port the current-user query to React Query with the existing key, stale time, no-retry behavior, and 401-to-null
   behavior.
4. Implement an auth provider only if it simplifies repeated user/pending access. Do not duplicate query state into
   `useState`.
5. Create route layouts:
   - Root provider layout.
   - Guest-only login route.
   - Authenticated layout containing navigation, constrained main content, and `Outlet`.
   - Wildcard 404 route.
6. Use render-time redirects with `<Navigate replace>` once auth settles. Render a stable loading state while auth is
   pending. Do not redirect in an effect if a route element can express the same state.
7. Lazy-load page route modules where useful, but do not create Suspense waterfalls for this tiny app.
8. Replace internal `<a href>` navigation with router links so all internal navigation remains SPA navigation.
9. Add integration tests for guest, authenticated, login, logout, wildcard, and protected-request 401 behavior.

Exit criteria:

- Direct navigation and refresh work for all routes when the deployment server provides SPA fallback.
- No login flash occurs for authenticated users.
- Cookies are sent on all API calls.
- A protected 401 consistently returns the user to `/login` without an infinite loop.

### Phase 3: Establish theme and shared shell

Goal: reproduce the current visual language with shadcn primitives and theme tokens.

Tasks:

1. Translate the emerald DaisyUI palette into shadcn semantic CSS variables (`--primary`, `--secondary`, foregrounds,
   muted, destructive, border, ring, background). Use valid Tailwind 4/shadcn color syntax, preferably OKLCH generated or
   documented by the current CLI.
2. Keep the light theme only unless the existing app gains dark mode before migration.
3. Preserve Inter Variable as `--font-sans`.
4. Recreate the desktop top navigation at `md` and above and the fixed mobile bottom navigation below `md`.
5. Preserve the authenticated content width (`max-w-xl`), navbar's slightly wider width where useful, mobile dock
   clearance, and `env(safe-area-inset-bottom)`.
6. Use shadcn `Button`, `Avatar`, and `DropdownMenu` for account/logout interactions. Use `NavLink` state for active
   navigation.
7. Place shadcn `Toaster` once at the root, bottom-right, preserving dismissible error feedback and approximately
   six-second duration.
8. Build shared loading/error/empty presentation using installed primitives without over-abstracting.

Visual rule: first reproduce spacing, hierarchy, breakpoints, stickiness, and interaction states. Minor changes
intrinsic to shadcn accessibility primitives are acceptable; gratuitous layout or typography changes are not.

Exit criteria:

- Desktop and mobile shell screenshots closely match the baseline.
- Keyboard focus is visible and menus are keyboard accessible.
- Content is not obscured by the mobile dock or device safe area.

### Phase 4: Migrate login and CRUD dialogs

Goal: replace native/DaisyUI forms and dialogs with accessible shadcn equivalents while retaining lifecycle behavior.

Tasks:

1. Port login using native form submission with shadcn `Input`, `Label`, and `Button`.
2. Preserve required fields, username capitalization/correction/spellcheck settings, pending disable/spinner state,
   inline invalid-credentials message, and general error toast.
3. Replace create/rename native dialogs with controlled shadcn `Dialog` components.
4. Replace delete confirmation with controlled shadcn `AlertDialog` components.
5. Preserve initial focus, reset on successful create, existing-value population on rename, Escape/X/Cancel close paths,
   validation, pending controls, and keeping a failed mutation dialog open.
6. Preserve the add-item dialog's special behavior:
   - One shared dialog instance serves global, store, and section add buttons.
   - The target `{ store_id?, section_id? }` is captured when opening.
   - `Create` succeeds and closes.
   - `Create & Add Another` succeeds, resets, remains open, and refocuses.
   - Enter in the name field has the existing “Create & Add Another” meaning, unless an accessibility test demonstrates
     this is harmful and the behavior change is explicitly approved.
7. Do not edit shadcn dialog source to mimic a bottom sheet. Use responsive application classes on `DialogContent`; keep
   the small-screen result visually close to the existing bottom-aligned dialog where supported cleanly.

Exit criteria:

- All forms send byte-for-byte-equivalent logical payloads.
- Focus enters and returns from dialogs correctly.
- Browser validation prevents empty submissions.
- Pending actions cannot be submitted twice.

### Phase 5: Migrate store and section administration

Goal: reproduce `/stores`, including lazy section loading and optimistic section reorder.

Tasks:

1. Port stores loading, error, empty, and populated states.
2. Use a controlled shadcn `Collapsible` for each store. Fetch `['stores', 'sections', storeId]` only after first
   expansion according to React Query's enabled semantics.
3. Keep one edit-store and one delete-store dialog at page level, driven by the selected store.
4. Keep one edit-section and one delete-section dialog per section-list scope, driven by the selected section; do not
   render a complete hidden dialog for every row.
5. Use `DropdownMenu` for rename/delete actions and ensure draggable transforms do not break menu positioning.
6. Implement section reorder with its own dnd-kit provider and sortable rows:
   - Handle-only activation.
   - Closest-center-style collision behavior.
   - Drag overlay.
   - Disable reorder while its mutation is pending.
   - Reorder only within one store.
   - Send the complete ordered ID array.
7. Preserve the React Query optimistic mutation sequence: cancel matching refetches, snapshot prior sections, write new
   order, rollback and toast on failure, then invalidate after settlement/success as appropriate for the installed Query
   version.
8. Add pure tests for reorder output and integration tests for optimistic update/rollback.

Exit criteria:

- Section queries do not fire before expansion.
- Add/rename/delete operations invalidate only the intended query scope.
- Successful and failed section reorder behave correctly.
- Menus remain usable before, during, and after a drag.

### Phase 6: Migrate the items page and delayed checking

Goal: reproduce item rendering and the reversible check interaction before enabling complex dragging.

Tasks:

1. Port item hierarchy types and total helpers without changing backend shapes.
2. Render global unassigned items, store unassigned items, and section items in backend order.
3. Preserve sticky layers:
   - Global unassigned and store headers at the top layer.
   - Store unassigned and section headers below the store header.
4. Compute totals/counts from local container state so they update immediately during dragging.
5. Port “organize store,” including pending text/spinner, items invalidation, error toast, and disabling affected drag
   controls while pending.
6. Implement a delayed-check manager with a `Map<itemId, timeout>` held in a ref plus state that drives pending visual
   checks.
7. Preserve exact check semantics:
   - Checking appears immediate.
   - Start a 1,500 ms timer.
   - Unchecking before expiry cancels the timer and sends no request.
   - Expiry sends exactly one check mutation.
   - Failure clears pending checked appearance and toasts.
   - Success invalidates items.
8. Clean up all timers on provider unmount and remove each timer entry after cancel, success, or error. Ensure React
   Strict Mode does not double-schedule mutations.
9. Confirm whether the backend removes checked items from the response. Preserve current visual behavior first; do not
   newly derive the checkbox from `item.checked` without verifying the contract.
10. Add fake-timer tests for cancel, expiry, failure, unmount, and duplicate-click behavior.

Exit criteria:

- Hierarchy, totals, sticky headings, add targets, and organize behavior match baseline.
- Delayed check sends zero or one request exactly as specified and leaks no timers.

### Phase 7: Implement multi-container item drag/drop

Goal: preserve the app's most complex interaction with testable state transitions.

Container IDs must retain unambiguous semantics:

- `global-unassigned`
- `store-{storeId}-unassigned`
- `section-{storeId}-{sectionId}`

Tasks:

1. Extract and test pure functions for:
   - Building `Record<containerId, itemId[]>` from query data.
   - Parsing and formatting container IDs.
   - Finding an item's container.
   - Removing/inserting within one reducer transaction.
   - Calculating final destination IDs and zero-based index.
2. Keep numeric item IDs distinct from string container IDs.
3. Synchronize reducer state from successful `['items']` data only when appropriate. Do not overwrite an active drag
   with a query effect. A simple safe policy is to defer query-to-container reset while dragging/moving, then reconcile
   after mutation settlement.
4. Register every container as droppable, including empty containers.
5. Recreate the existing collision intent using current dnd-kit APIs:
   - First select the intersecting/overlapping container.
   - Then select the closest item within that container.
   - Return the container itself for an empty container or a pointer below the last item when moving across containers.
6. During drag move/over, update local state when crossing containers so rows and counts respond immediately.
7. On drag end, finalize same-container reorder, derive destination from the reducer's final state, and send exactly one
   move mutation.
8. Add explicit drag-cancel handling: clear overlay and restore the snapshot taken at drag start without sending a
   mutation.
9. On move failure, rebuild from the last authoritative query data and show `Failed to move item`.
10. Use a separate presentational overlay row that does not call sortable hooks.
11. Apply transforms only where necessary. Preserve drag opacity, transition, overlay elevation, and handle-only
    interaction.
12. Disable all item dragging while a move mutation is pending and disable a store's items while organization for that
    store is pending.
13. Add keyboard instructions/labels and verify keyboard movement using current dnd-kit accessibility APIs.

Required drag scenarios:

- Reorder within global unassigned.
- Reorder within store unassigned.
- Reorder within a section.
- Move global to store, store to global, section to store unassigned, between sections, and across stores.
- Drop into every type of empty container.
- Drop before the first and after the last item.
- Cancel a drag.
- Fail a move mutation and restore authoritative order.
- Attempt interaction while move/organize is pending.

Exit criteria:

- Pure reducer/helper tests cover all transitions and index calculation.
- Real-browser tests cover representative pointer, touch-sized viewport, and keyboard cases.
- Exactly one API mutation is sent per completed drag and none for cancel/no-op.

### Phase 8: Cleanup and release verification

Goal: remove migration residue and prove production readiness.

Tasks:

1. Remove all unused Solid, DaisyUI, old dnd, old icon, and old toast files/imports/dependencies.
2. Search for Solid JSX artifacts: `class=`, lowercase React-incompatible DOM props, Solid control-flow components,
   accessors passed as values, `createSignal`, `createStore`, `createEffect`, `createMemo`, `For`, `Show`, `Switch`,
   `Match`, and Solid types.
3. Search for DaisyUI classes such as `btn`, `loading`, `modal`, `dropdown`, `collapse`, `alert`, `dock`, `divider`, and
   `menu`; replace them unless they are coincidental local classes.
4. Confirm no generated `dist` files are tracked.
5. Run `npm outdated` and document justified holds.
6. Run all checks and the production preview.
7. Compare final desktop/mobile screenshots to Phase 0 and fix material regressions.
8. Test a direct browser request to `/stores` against the intended production host. Configure hosting fallback to
   `index.html` outside this frontend if needed; document that deployment requirement.
9. Inspect the production bundle/dependency tree to confirm no Solid runtime or DaisyUI remains.
10. Update package name/description away from `vite-template-solid` to an application-appropriate name without changing
    deployment identity unexpectedly.

Exit criteria:

- No Solid or DaisyUI production code remains.
- All acceptance checks below pass.
- The final diff contains no temporary migration files, TODO placeholders, disabled tests, or unexplained dependency
  duplication.

## 7. Test Strategy

Add tests as part of the rewrite rather than after all behavior has moved.

### Tooling

- Vitest for unit and component/integration tests.
- React Testing Library and `@testing-library/user-event` for user behavior.
- MSW for deterministic API interception and request-payload assertions.
- Use fake timers only for delayed-check unit/integration tests.

Add scripts with clear names, at minimum:

- `test`: run unit/integration tests once.
- `test:watch`: local watch mode.
- Existing `build`, `tsc`, `lint`, and Prettier scripts.
- Optionally `check` to run typecheck, lint, formatting, unit tests, and build in a deterministic sequence.

### Required automated coverage

- API prefix, credentials, JSON/null parsing, abort signal, and error classes.
- Auth guards and all redirect paths.
- Exact login/logout payload and refetch behavior.
- Query enabled/invalidation scopes.
- Store and section CRUD dialog success/error/pending paths.
- Section optimistic reorder and rollback.
- Item container construction, movement, index calculation, cancel, and rollback.
- Delayed-check timer semantics and cleanup.
- Add-item target and Enter/Create/Create Another behavior.
- Desktop/mobile navigation and 404.

### Browser/visual coverage

- Login at mobile and desktop widths.
- Items with global, store-unassigned, section, and empty lists.
- Stores collapsed and expanded.
- Dialog and dropdown open states.
- Item drag overlay and section drag overlay.
- Mobile bottom navigation and safe area.
- Keyboard tab order, visible focus, dialog focus trap/return, menu operation, checkbox naming, and drag handle
  accessible names.

Do not make pixel-perfect snapshots the only visual assertion. Combine screenshots with explicit behavior and
accessibility assertions.

## 8. Detailed Acceptance Checklist

### Functional

- [ ] Unauthenticated users see `/login` and cannot see protected page content.
- [ ] Authenticated users visiting `/login` are replaced to `/` without login flash.
- [ ] Login sends `auth_type: "web"`; logout clears authenticated UI.
- [ ] All requests include cookies and protected 401s redirect safely.
- [ ] Items render in backend order and all totals are correct.
- [ ] Add-item sends correct optional store/section IDs for every launch point.
- [ ] Delayed checking has a 1.5-second undo window and sends at most one mutation.
- [ ] All required item drag scenarios pass, including empty lists and failure rollback.
- [ ] Organize-store pending/error/success behavior is preserved.
- [ ] Sections load only after expansion.
- [ ] Store and section CRUD flows preserve success, failure, and pending behavior.
- [ ] Section reorder is optimistic, scoped to one store, and rolls back on failure.
- [ ] Unknown routes show the 404 page.

### Visual and interaction

- [ ] The result remains close to the current emerald, compact shopping-list design.
- [ ] Desktop top navigation and mobile bottom navigation switch at `md`.
- [ ] Main width, sticky headers, z-index layers, and safe-area spacing match intent.
- [ ] Loading, empty, error, disabled, hover, focus, and dragging states are clear.
- [ ] Dialogs, dropdowns, checkboxes, and drag handles are accessible by keyboard.
- [ ] Touch dragging does not scroll the page from the handle.
- [ ] No content or menu is clipped due to transforms or overflow.

### Technical

- [ ] React Strict Mode is enabled and produces no duplicate mutations or lifecycle warnings.
- [ ] TypeScript strict checking passes without broad `any` or suppression comments.
- [ ] ESLint, Prettier, unit/integration tests, and production build pass.
- [ ] QueryClient, dnd sensors/provider state, contexts, and timers remain stable across renders.
- [ ] No Solid, DaisyUI, old dnd, old icon, or old toast dependency remains.
- [ ] All shadcn primitives were installed via CLI and unnecessary primitives were removed.
- [ ] Existing manifest, icons, viewport metadata, and Vite API proxy remain functional.
- [ ] Production hosting is documented/configured for SPA fallback.

## 9. Agent Documentation and Tooling

### shadcn

Use the official shadcn MCP server. It can inspect `components.json`, search the registry, show current component APIs,
and invoke registry installs. Configure it through the current official command for the agent client, for example:

```sh
npx shadcn@latest mcp init --client opencode
```

If that client flag is unavailable in the installed CLI, use the official manual MCP configuration with:

```text
command: npx
args: shadcn@latest mcp
```

Also consider installing the official shadcn agent skill:

```sh
npx skills add shadcn/ui
```

The skill is valuable even with MCP because it injects project-aware composition, theming, CLI, and primitive-base
guidance. Prefer the official CLI/MCP/skill over similarly named third-party shadcn MCP packages.

### TanStack

Do not configure the removed `@tanstack/cli mcp` server. TanStack's official MCP command was removed and old MCP client
configurations will break.

Use the current TanStack CLI's deterministic JSON commands instead:

```sh
npx @tanstack/cli@latest libraries --json
npx @tanstack/cli@latest search-docs "React Query optimistic updates" --library query --framework react --json
npx @tanstack/cli@latest doc query framework/react/overview --json
```

Agents can also fetch the official machine-readable indexes directly:

- `https://tanstack.com/llms.txt`
- `https://tanstack.com/query/latest/llms.txt`
- `https://tanstack.com/router/latest/llms.txt` only if reassessing the router decision.

### Other useful agent tools

- Browser devtools automation: useful for network payload comparison and accessibility-tree inspection.
- Context7 or another documentation MCP: optional fallback for React Router and dnd-kit, but official docs/LLM indexes
  should be preferred when available.
- GitHub MCP: optional for inspecting current upstream issues or migration guides; do not grant write permissions merely
  for documentation access.

MCP servers improve documentation retrieval but do not replace tests, source inspection, or package-version
verification. Keep the enabled MCP set small so agents are not distracted by duplicate, stale, or untrusted tools.

## 10. Final Handoff Format

The orchestrator's final report must include:

1. Architecture and dependency choices actually used, including any deviation from this plan.
2. Major source migrations and intentionally changed behavior.
3. Exact verification commands and their results.
4. E2E/browser matrix and screenshot comparison result.
5. Remaining risks, deployment SPA-fallback requirement, and any backend-dependent checks that could not run.
6. Confirmation that Solid, DaisyUI, and legacy dependencies are absent from the production dependency graph.

The rewrite is complete only when the React implementation is the sole production implementation and the acceptance
checklist is satisfied.
