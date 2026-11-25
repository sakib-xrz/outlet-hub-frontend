# OutletHub Frontend

Web client for OutletHub, a multi-outlet POS management system. It contains the platform layer (authentication, routing, API and state infrastructure, design system, application shell, tooling) **Outlet Management** (phase 1), **Staff & Outlet Membership Management** (phase 2) and **Master Menu Management** (phase 3). Outlet menu assignment, inventory, sales, receipt and reporting features are not implemented yet.

## Stack

React 19 · Vite 8 · TypeScript 6 (strict) · React Router 8 (data router) · Tailwind CSS 4 · shadcn/ui (Radix, `radix-vega`) · Lucide · TanStack Query 5 · Zustand 5 · React Hook Form 7 + Zod 4 · Axios · Sonner · Vitest 5 + React Testing Library · ESLint 10 · Prettier · Husky · lint-staged · Commitlint. Node 24 and pnpm 12, the same as the backend.

TypeScript is pinned to 6.0 because `typescript-eslint` does not yet support TypeScript 7.

## Structure

```text
src/
├── app/                  # App, providers, central route table
├── components/
│   ├── ui/               # shadcn/ui primitives (generated; minimal local edits)
│   ├── layout/           # auth layout, app shell, sidebar, header, page container
│   └── shared/           # loaders, error/empty states, theme provider/toggle, error boundary
├── config/               # Zod-validated environment (shared with vite.config.ts)
├── constants/            # route paths
├── features/auth/        # components · hooks · services · schemas · stores · types
├── hooks/                # generic hooks (use-mobile)
├── lib/
│   ├── api/              # Axios clients, auth interceptors, error normalization, contracts
│   ├── query/            # QueryClient and defaults
│   └── utils/            # safe redirects
├── pages/                # route-level composition: auth, dashboard, errors
├── routes/               # protected/public/role guards, root redirect, route error boundary
├── stores/               # non-sensitive persisted preferences (theme, sidebar)
└── styles/globals.css    # Tailwind entry and design tokens
tests/unit/               # isolated unit and component tests (network fully mocked)
```

Dependencies flow one way: `pages → features/components → lib/config`. Nothing in `lib/` imports from `features/`. The auth interceptors are generic and receive their session callbacks from `features/auth/services/session.ts`. All imports use the `@/` alias. Relative parent imports (`../`) are blocked by ESLint.

## Local development

```bash
pnpm install --frozen-lockfile
cp .env.example .env.development      # VITE_API_BASE_URL=http://localhost:3000/api/v1
pnpm dev                              # http://localhost:5173 (strict port)
```

Run the backend on port 3000 with these values in `backend/.env.development`:

```dotenv
ALLOWED_ORIGINS=http://localhost:5173
COOKIE_SECURE=false
COOKIE_SAME_SITE=strict
COOKIE_DOMAIN=
```

Open the app at `http://localhost:5173`, not `127.0.0.1`. That keeps the frontend and the API on the same site (`localhost`), so the `SameSite=Strict` refresh cookie is sent. It also matches the backend's exact-origin allowlist.

## Environment

| File               | Committed | Purpose                             |
| ------------------ | --------- | ----------------------------------- |
| `.env.example`     | yes       | Template                            |
| `.env.development` | no        | `pnpm dev`                          |
| `.env.production`  | no        | Local `pnpm build` / `pnpm preview` |

There is one variable, `VITE_API_BASE_URL`, the backend base URL including `/api/v1`. `src/config/env-schema.ts` validates it with Zod, both at runtime and inside `vite.config.ts` during `vite build`. A missing or invalid value therefore **fails the build**. The validation:

- normalizes trailing slashes;
- requires the path to end with `/api/v1`, and to contain it exactly once;
- rejects credentials, query strings and fragments;
- requires `https` in production builds, except for `localhost`.

Every `VITE_*` value is embedded in the public JavaScript bundle. Never put secrets, database URLs, JWT secrets or private keys in frontend environment variables. Variables set in the process environment take precedence over `.env.*` files, which is how Coolify supplies values at build time. Vitest runs in its internal `test` mode with a fixed `.invalid` URL; there is no `.env.test`.

## Commands

| Command                                      | Purpose                                         |
| -------------------------------------------- | ----------------------------------------------- |
| `pnpm dev`                                   | Vite dev server                                 |
| `pnpm build`                                 | Type-check (`tsc -b`) and build to `dist/`      |
| `pnpm preview`                               | Serve `dist/` locally (not a production server) |
| `pnpm typecheck`                             | Strict TypeScript                               |
| `pnpm lint` / `pnpm lint:fix`                | ESLint                                          |
| `pnpm format` / `pnpm format:check`          | Prettier (with Tailwind class sorting)          |
| `pnpm test` / `test:watch` / `test:coverage` | Vitest                                          |
| `pnpm verify`                                | lint, typecheck, format check, tests, build     |
| `pnpm security:audit`                        | High-severity production dependency audit       |

## Routing

`src/app/router.tsx` is the single route table, built with `createBrowserRouter`. `RouterProvider` comes from `react-router/dom`.

| Path                      | Guard                                    | Notes                                                     |
| ------------------------- | ---------------------------------------- | --------------------------------------------------------- |
| `/`                       | none                                     | Sends you to `/dashboard` or `/login` based on auth state |
| `/login`                  | `PublicRoute`                            | Lazy auth layout and page                                 |
| `/dashboard`              | `ProtectedRoute` → `RoleGuard`           | Lazy app shell and page                                   |
| `/outlets`                | `ProtectedRoute` → `RoleGuard`           | Outlet list; filters, sort and page live in the URL       |
| `/outlets/:outletId`      | `ProtectedRoute` → `RoleGuard`           | Outlet details                                            |
| `/staff`                  | `ProtectedRoute` → `RoleGuard(HQ_ADMIN)` | Staff list; filters, sort and page live in the URL        |
| `/staff/:staffId`         | `ProtectedRoute` → `RoleGuard(HQ_ADMIN)` | Staff details and management actions                      |
| `/menu-items`             | `ProtectedRoute` → `RoleGuard(HQ_ADMIN)` | Master menu list; filters, sort and page live in the URL  |
| `/menu-items/:menuItemId` | `ProtectedRoute` → `RoleGuard(HQ_ADMIN)` | Menu item details                                         |
| `/unauthorized`           | none                                     | Lazy                                                      |
| `*`                       | none                                     | Not-found page                                            |

- **Code splitting:** pages and layouts load through the route `lazy` property. `HydrateFallback` covers the first lazy load, and the app shell shows a progress bar during navigation.
- **No flash of protected content:** guards render a loader while auth status is `initializing`. Nothing protected appears until the session is restored or rejected.
- **Redirects:**
  - `ProtectedRoute` sends signed-out users to `/login?redirect=<path>`.
  - `PublicRoute` sends signed-in users to `getSafeRedirect(redirect)`. Only same-origin relative paths are accepted. Protocol-relative URLs, backslashes, control characters, external URLs and `/login` (which would loop) fall back to `/dashboard`.
- **Errors:** `RouteErrorBoundary` handles route errors, including chunk-load failures after a deploy, by offering a reload. `AppErrorBoundary` wraps the whole tree.
- **Guards are UX only.** The backend remains authoritative for authentication and authorization.

To add a route, add it to `router.tsx` with `lazy`, under the right guard. Add a navigation entry, with its allowed roles, to `components/layout/navigation.ts` only once the page actually works.

## Outlet management

The code lives in `src/features/outlets/`, with pages in `src/pages/outlets/`. The sidebar shows **Outlets** to both roles.

**List (`/outlets`):**

- Search is debounced by 300 ms and matches code or name.
- There is a status filter (all, active, inactive) and a sort option (newest, oldest, name, code, recently updated).
- Pagination is server-side, 20 per page.
- `search`, `status`, `sort` and `page` are kept in the URL, so refresh, sharing and back/forward work. Changing a filter resets to page 1, and default values are left out of the URL.
- The list shows loading skeletons, an empty state that depends on the filters and role, an error state with retry, and a "past the last page" state.

**Details (`/outlets/:outletId`):**

- Shows code, name, address, status, created date and last-updated date.
- 403 shows "No access to this outlet"; 404 or a malformed id shows "Outlet not found".

**Management (HQ admins only):**

- _Create outlet_ and _Edit_ open a dialog containing the shared `OutletForm`.
  - The code is uppercased as you type, and is read-only when editing.
  - The schemas mirror the backend's validation rules.
  - Server field errors, including a duplicate code (409), appear on the matching field. Entered values are kept on failure, and the form resets when the dialog closes.
- _Activate/Deactivate_ asks for confirmation first. The deactivation text explains that staff lose access, that future operations are blocked, and that records are preserved. There is no optimistic update: the UI changes only after the server confirms.
- Staff see read-only views. The backend enforces the same rules.

**Server state:**

- Query keys:
  - `outletKeys.all` = `['outlets']`
  - `lists()` and `list(filters)`
  - `details()` and `detail(id)`
- Lists use `keepPreviousData`, so the table doesn't flash while paging.
- After a successful create, edit or status change, the returned outlet is written to `detail(id)` and every list is invalidated.
- Form mutations show errors inline (`suppressErrorToast`). Status-change errors use the global, de-duplicated toast.

**Tests:** `tests/unit/outlets/` runs the real Axios client, interceptors, query client and router, with a mocked HTTP adapter. It covers:

- listing, loading, empty and error states and retry;
- debounced search with a page reset, and the status filter;
- role-based actions;
- create, plus list invalidation;
- validation and duplicate-code errors;
- edit, with a read-only code;
- the status confirmation, including double-submit prevention;
- 403 and 404 states;
- service contract validation.

## Staff management (HQ administrators only)

The code lives in `src/features/staff/`, with pages in `src/pages/staff/`. The sidebar shows **Staff** only to `HQ_ADMIN`. Outlet staff who open `/staff` directly are sent to `/unauthorized` by `RoleGuard`, and the backend also rejects them.

**List (`/staff`):**

- Debounced email search, status filter, outlet filter, sort, and server-side pagination. All of it is kept in the URL.
- Loading, empty, error-with-retry and past-the-last-page states.
- The outlet filter lists the first 100 outlets by code. An outlet selected through the URL but beyond those still filters correctly.

**Create:**

- Fields: email, password, confirm password, and outlets (optional).
- The confirmation is checked on the client and never sent.
- The password rules match the backend: 12–128 characters, not just spaces, not the email.
- A duplicate email (409) appears on the email field. The entered values stay, and the passwords are cleared when the dialog closes.

**Details (`/staff/:staffId`):**

- Shows email, role, status, created and updated dates, and the assigned outlets (with status) linking to their outlet pages.
- Actions: edit email, manage outlets, reset password, and activate/deactivate.

**Outlet picker** (`features/outlets/components/outlet-picker.tsx`):

- A searchable, server-paged checkbox list (`useInfiniteQuery`, 50 per page, _Load more_).
- Selections are stored separately from search results, so searching or paging never drops a selection.
- Inactive outlets are marked and disabled for new assignment. Existing inactive assignments stay checked and can be kept or removed.
- _Remove all_ sends `[]`.
- The dialog submits the complete intended set and shows how many outlets will be added and removed.
- The form initializes once per opening, so a background refetch doesn't overwrite an in-progress selection. The last save wins.

**Status and password:**

- The deactivate confirmation explains that sessions are revoked and records are preserved.
- The reset-password dialog has new and confirm fields with a visibility toggle. It explains that sessions are revoked and that access already granted can last up to 15 minutes.
- Password mutations use `gcTime: 0` and are reset right after they settle, so no password stays in the TanStack mutation cache or devtools. Form state goes away when the dialog closes.

**Server state:** query keys are `staffKeys.all`, `lists()`, `list(filters)`, `details()` and `detail(id)`. After each mutation, the returned staff record is written to `detail(id)` and every list is invalidated.

**Tests:** `tests/unit/staff/` covers:

- the list, empty, error and retry states;
- pagination, debounced search and the outlet filter, stored in the URL;
- HQ-only navigation and direct-URL blocking;
- create validation, a password mismatch, outlet selection, and that the confirmation is never sent;
- duplicate emails;
- email edits with a conflict;
- assignment rules (inactive outlets kept or blocked, the selection surviving search and background refetch, remove all, load more);
- the status confirmation with double-submit prevention;
- password reset validation, with no password left in the mutation cache;
- the not-found state.

## Master menu (HQ administrators only)

The code lives in `src/features/menu-items/`, with pages in `src/pages/menu-items/`. The sidebar shows **Master Menu** only to `HQ_ADMIN`. Outlet staff who open the URL directly reach `/unauthorized`, and the backend returns 403.

- **List:** debounced SKU/name search, status filter, sort (including by price), and server-side pagination, all kept in the URL. Changing a filter resets to page 1. Loading, empty, error-with-retry and past-the-last-page states.
- **Create/edit dialog:** fields are SKU (uppercased as you type, read-only when editing), name, base price and description.
  - The price input is `type="text"` with `inputMode="decimal"`. The value stays a string in form state, and `valueAsNumber` is never used.
  - Validation matches the backend: up to 2 decimals, from 0 to 9,999,999,999.99, with no exponents or signs. On submit the price is padded to two decimals, so `12.5` is sent as `"12.50"`.
  - A duplicate SKU (409) appears on the SKU field, and the entered values stay.
  - Editing never sends `sku`.
- **Details:** SKU, name, description, base price, master status, and created and updated dates, with Edit and Activate/Deactivate. 404 shows "Menu item not found"; 403 shows "Access denied".
- **Deactivation confirmation:** explains that this is the **master** status, for all outlets at once. The item stops being sellable everywhere, while assignments, stock, overrides and past sales are kept. Activation explains that each outlet still needs its own active assignment.
- **Money:**
  - `src/lib/utils/money.ts` validates prices (`moneyInputSchema`) and formats them (`formatMoney`) using string operations only, with no `Number`.
  - Responses are validated as `"<digits>.<2 digits>"` strings.
  - The display currency is BDT (`৳`), a single-currency assumption because the schema has no currency column.
- **Server state:** query keys are `menuItemKeys.all`, `lists()`, `list(filters)`, `details()` and `detail(id)`. Each mutation writes `detail(id)` and invalidates every list.
- **Tests:** `tests/unit/menu-items/` and `tests/unit/lib/money.test.ts` cover:
  - the list, empty, error and retry states;
  - pagination, debounced search and sorting by price, stored in the URL;
  - create validation, including bad decimal values;
  - normalized string submission;
  - duplicate SKUs;
  - edit with a read-only SKU, keeping the price a string;
  - details and not-found;
  - the deactivation confirmation with double-submit prevention;
  - HQ-only navigation and direct-URL blocking;
  - exact formatting.

**Phase 3 fix:** the staff password-reset success toast used to say the staff member was "signed out of all sessions". It now says refresh sessions were revoked and that access already granted may last up to 15 minutes, which matches the backend.

## Authentication

### Backend contract (verified against `backend/src`)

| Endpoint             | Request                                  | Success `data`                                                                      |
| -------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `POST /auth/login`   | `{ email, password }` + trusted `Origin` | `{ accessToken, tokenType: 'Bearer', expiresIn, user }` and sets the refresh cookie |
| `POST /auth/refresh` | refresh cookie + trusted `Origin`        | same as login; the cookie is rotated                                                |
| `POST /auth/logout`  | refresh cookie + trusted `Origin`        | `{}`; the session is revoked and the cookie cleared                                 |
| `GET /auth/me`       | `Authorization: Bearer <token>`          | `{ user }`                                                                          |

- **Response envelopes:**
  - Success: `{ success: true, message, data }`.
  - Errors: `{ success: false, message, code, requestId, errors?: [{ field, message }] }`.
- **User:** `{ id, email, role }`, where `role` is `HQ_ADMIN` or `OUTLET_STAFF`.
- **Login validation:** email is trimmed, lowercased, a valid address, at most 320 characters. Password is 8–1024 characters.
- **Refresh cookie:** HttpOnly, path `/api/v1/auth`, and `SameSite`/`Secure`/`Domain` set from backend config. The default lifetime is 30 days.
- **Access token:** HS256, default lifetime 900 s.
- **Status codes:**
  - Every authentication failure is `401 AUTHENTICATION_ERROR`.
  - Untrusted origins and role failures are `403 AUTHORIZATION_ERROR`.
  - Throttling is `429 RATE_LIMITED`.
  - Field validation errors are `400 VALIDATION_ERROR`.
- **Replay protection:** refresh-token reuse revokes the **whole session family**.

All auth responses are validated with Zod (`features/auth/schemas`). If the contract drifts, the client shows a safe error instead of misbehaving.

### Token lifecycle

- **Access token:** kept only in memory (`useAuthStore`, a Zustand store without persistence or devtools middleware). It is never written to localStorage, sessionStorage, IndexedDB or any persisted store.
- **Refresh token:** stays in the backend's HttpOnly cookie. JavaScript never reads it.
- **Startup:** `startAuthSession()` attaches the interceptors and restores the session once. A module-level promise makes this safe under StrictMode and repeated calls.
- **Session hint:** a non-sensitive flag, `outlethub:session-hint = "1"`, records only that this browser has signed in before. Without it, startup skips the refresh call. This matters because the backend counts _failed_ refreshes toward the login rate limit.
- **Proactive refresh:** if the token expires within 30 s, the request interceptor refreshes before sending. Mutations then rarely see a 401.
- **Reactive refresh:** this happens only for a `401` on a request that **carried** a bearer token. Login and refresh failures are never refreshed. A 401 from login means invalid credentials; a 401 from refresh means the session has ended.
- **Retries after refresh:** a request that got a 401 is retried at most once. Only `GET`/`HEAD`/`OPTIONS` requests are replayed automatically. Mutations are replayed only with `retryAfterRefresh: true`; otherwise they fail with "Your session was renewed. Please try again."
- **Failed refresh:** `401` ends the session. Network, timeout, 5xx and 429 failures keep the current session.

### Refresh coordination

- **Within a tab:** `refreshSession()` is single-flight. Concurrent 401s share one refresh, and a request whose token was already replaced retries with the new token without refreshing again.
- **Across tabs:** login, refresh and logout all run under the Web Lock `outlethub:auth`. A tab never sends a refresh cookie that another tab is rotating, which would trigger the backend's replay detection. Without Web Locks, an in-tab queue gives the same ordering inside one tab.
- **Session epoch:** login, logout and session expiry each increment an epoch. A refresh that started before the epoch changed throws away its result, so a stale refresh cannot restore a signed-out session.
- **Logout:** clears memory, the query cache and the hint, and aborts in-flight authenticated requests through a session `AbortSignal`. It then calls `/auth/logout` under the lock, after any in-flight refresh, so the newest cookie is the one revoked.
- **Account change:** if a refresh returns a different user, user-scoped caches are cleared.
- **Cross-tab events:** a `BroadcastChannel` carries only `login` and `logout` events, never tokens or credentials. Other tabs sign out, or restore their own session through their own refresh.

## Data layer conventions

- **Axios** (`lib/api/client.ts`):
  - There are two instances. `apiClient` adds bearer tokens and refresh handling. `authClient` serves login, refresh and logout, and has no auth interceptors, which prevents recursion.
  - Both use a 15 s timeout and `withCredentials: true`, and send only CORS-allowed headers.
  - Every error is normalized to `ApiError` (`lib/api/errors.ts`). `kind` is one of: `network`, `timeout`, `canceled`, `invalid_credentials`, `session_expired`, `unauthenticated`, `forbidden`, `validation`, `not_found`, `conflict`, `rate_limited`, `server` or `unknown`.
  - Messages shown to users are written by the client. Raw backend messages are never displayed. Validation `fieldErrors` are mapped to form field names, so `body.email` becomes `email`.
  - Services pass React Query's `signal` through for cancellation.
- **Services:** every HTTP call lives in a feature service (for example `features/auth/services/auth.service.ts`) and returns parsed, typed data.
- **TanStack Query** (`lib/query/client.ts`):
  - `staleTime` is 30 s and `gcTime` 5 min.
  - Queries retry up to twice, and only for `network`, `timeout` and `server` errors. Mutations never retry.
  - A background refetch error shows a toast only when data is already displayed. Mutation errors show a toast unless `meta.suppressErrorToast` is set. Toast IDs prevent duplicates.
  - Query keys are per-feature factories, for example `authKeys.currentUser()` gives `['auth', 'current-user']`.
  - The whole cache is cleared on every session boundary.
  - Devtools load only in development.
- **State ownership:**
  - Server data lives in TanStack Query.
  - The session (token, expiry, session user, status) lives in `useAuthStore`.
  - Form state lives in React Hook Form.
  - Theme and sidebar preferences live in the persisted `usePreferencesStore`.
  - Everything else is local component state.
  - The session user comes from the login/refresh response, and the guards use it. The dashboard's `/auth/me` query is a server read that verifies the authenticated API path.
- **Forms:**
  - Schemas live in `features/auth/schemas` and mirror the backend rules.
  - Fields use React Hook Form `Controller` with shadcn `Field`, `FieldLabel` and `FieldError`, plus `aria-invalid` and `aria-describedby`.
  - Validation runs `onTouched`.
  - Server field errors go to `setError(field)`. Other errors go to `root.server`, shown in an `Alert`.
  - Submit is disabled while pending, and inputs carry autocomplete hints (`username`, `current-password`). The password visibility toggle is accessible.

## Design system

- **Tokens:** semantic tokens are defined in `src/styles/globals.css`: background, foreground, primary, muted, accent, destructive, border, ring, sidebar, and radius scales. They are CSS variables for `:root` and `.dark`, using OKLCH.
- **Font:** Inter Variable is self-hosted through Fontsource, with no third-party requests. Unicode subsets download on demand.
- **Theme:** light, dark or system, persisted. A tiny blocking script, `public/theme-init.js`, applies the theme before first paint, avoiding a flash without inline scripts, so it is compatible with a strict CSP.
- **Accessibility:** global `:focus-visible` rings, `prefers-reduced-motion` support, a skip link, and muted text darkened for AA contrast.
- **Components:** only the shadcn components in use are installed: button, input, label, card, field, dropdown-menu, sheet, sidebar, separator, skeleton, tooltip, avatar, alert and sonner. Two local edits were made:
  - The sidebar no longer writes a `sidebar_state` cookie; its state is controlled by the preferences store.
  - The Toaster uses the app theme store instead of `next-themes`.
- **Shared states:** use `FullPageLoader`, `Spinner`, `ErrorState`, `EmptyState` and `PageContainer` rather than building new ones.

## Testing

```bash
pnpm test
```

There are 65 tests in 8 files:

- environment validation;
- error normalization;
- safe redirects;
- auth interceptors: bearer injection, one replay, mutations never replayed, loop protection, proactive refresh, cancellation;
- session coordination: StrictMode-safe initialization, the session hint, single-flight refresh, concurrent 401s sharing one refresh, account change, the logout-versus-in-flight-refresh race, offline logout;
- the auth store;
- protected, public and role guards;
- the login form: validation, normalization, duplicate-submit prevention, invalid credentials, server field errors, password toggle.

All HTTP traffic is mocked. `tests/setup.ts` replaces Axios's default adapter so that any request a test forgets to mock fails immediately. Tests never contact the backend or the database.

### Manual smoke test (against a running backend)

Run this only with approval; it writes refresh sessions to the shared database.

1. Start the backend and run `pnpm dev`. Seed an admin with the backend's `pnpm db:seed:admin`.
2. Open `http://localhost:5173/dashboard`. You should be redirected to `/login`.
3. Submit an empty form, then a wrong password. Check the field errors and the generic "Invalid email or password." message.
4. Sign in. You land on `/dashboard` and the account card shows your email and role.
5. In DevTools → Application, check that localStorage holds only `outlethub:session-hint` and `outlethub:preferences`, and that `outlethub_refresh` is HttpOnly with path `/api/v1/auth`.
6. Reload `/dashboard`. The session restores with one `/auth/refresh` call and protected content does not flash.
7. Open a second tab, then sign out in one tab. The other tab signs out too.
8. With the backend stopped, reload. You see "Could not restore your session" with a Retry button, and the session hint is kept.

## Coolify deployment (static SPA)

Create a Coolify application from this repository. The backend is a separate repository and a separate Coolify application.

| Setting           | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| Build pack        | Nixpacks, with "Is it a static site?" enabled and the SPA option on |
| Base directory    | `/` (this repository's root)                                        |
| Install command   | `pnpm install --frozen-lockfile`                                    |
| Build command     | `pnpm build`                                                        |
| Publish directory | `dist`                                                              |
| Domain            | `https://outlet.example.com` (Coolify issues the certificate)       |

Set these environment variables:

- `VITE_API_BASE_URL=https://api.example.com/api/v1`. Mark it **available at build time**. It is compiled into the bundle, so changing it requires a redeploy.
- `NIXPACKS_NODE_VERSION=24`.

The build needs devDependencies (Vite, TypeScript). If the install skips them because `NODE_ENV=production` is set at install time, set `NPM_CONFIG_PRODUCTION=false`, or use `pnpm install --frozen-lockfile --prod=false`.

SPA fallback must serve `index.html` for unknown paths, so a reload on `/dashboard` works. Coolify's static SPA mode provides this; `vite preview` must not be used in production.

### Backend production values

```dotenv
ALLOWED_ORIGINS=https://outlet.example.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
COOKIE_DOMAIN=
TRUST_PROXY=1
```

Put the frontend and API on subdomains of one registrable domain. They are then the same site, and the `Strict` host-only refresh cookie on `api.example.com` is sent with credentialed requests. Separate sites would need `COOKIE_SAME_SITE=none`, and browsers that block third-party cookies would then break session restore, so avoid that. Avoid Coolify's generated `sslip.io` hostnames for the same reason.

### Recommended headers (configure in Coolify's proxy, for example Traefik header labels)

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.example.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cache-Control: no-cache                         (index.html)
Cache-Control: public, max-age=31536000, immutable   (/assets/*)
```

`style-src 'unsafe-inline'` is needed because Radix positioning and Sonner set inline styles. Scripts need no inline allowance.

## Git hooks

Husky hooks live in `frontend/.husky`, mirroring `backend/.husky`. `pnpm install` runs `prepare: husky`, which installs them when `frontend/` is the Git repository root.

- **pre-commit:** `lint-staged` (ESLint `--fix` and Prettier on staged files).
- **commit-msg:** Commitlint with Conventional Commits.

## Security decisions

- Access tokens live in memory only. Refresh tokens live only in an HttpOnly cookie. Nothing sensitive is persisted.
- Responses are validated at runtime. Only client-written error messages are shown. No `dangerouslySetInnerHTML` is used.
- Redirects are sanitized. There is no production auth logging and no devtools middleware on the auth store.
- Errors in development log only the error `kind`. Headers and tokens are never logged.
- The query cache is cleared and requests are aborted on every session change.
- Web Locks serialize cookie rotation, protecting against the backend's family-wide replay revocation.
- Only CORS-safelisted or allowed headers are sent. Credentialed requests go to an exact-origin allowlist.

## Known limitations

- Each tab keeps its own access token, because tokens are deliberately not shared. Tabs refresh one after another, never together, so N tabs can cause N rotations.
- Web Locks need a secure context (HTTPS or `localhost`). Without them, two tabs refreshing at the same instant could trigger backend replay detection and sign out every session.
- If a tab closes after the backend rotated the cookie but before the browser stored the new one, the next refresh is treated as a replay. The backend has no grace window.
- A logout made while offline clears only local state. The server session stays valid until it expires or is reused.
- The backend uses one 401 code for all authentication failures, so the client tells them apart by endpoint context.
- `RoleGuard` currently allows both roles on every page. Outlet management actions are hidden from staff in the UI, and the backend enforces the restriction.
- Outlet dates are shown in the browser's local time zone.
- The staff outlet filter offers the first 100 outlets by code. Assignment uses the fully paginated picker.
- After a password reset, the staff member's existing access token works until it expires (up to 15 minutes). After reactivation, an unexpired token from before the deactivation works again. There is no access-token denylist.
- Staff accounts have only an email. The schema has no name or phone fields.
- Money is displayed in BDT (`৳`) as a fixed single-currency convention. There is no locale-specific currency formatting.
- `pnpm audit` reports one moderate advisory (minimatch) through the dev-only `shadcn` CLI. It is not in the production bundle; `security:audit --prod` is clean.
- There are no browser E2E tests, by design. The production build was smoke-tested over HTTP only.
