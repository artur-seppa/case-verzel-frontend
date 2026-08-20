# Frontend Eventos e Ingressos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement every screen of the Plataforma de Eventos e Ingressos frontend (public catalog, seat-map reservation, simulated payment via SSE, meus ingressos, sharing, organizer event management, portaria/gatekeeper) against the already-implemented backend at `../case-verzel-api`.

**Architecture:** Feature-based folders under `src/features/*` (components + api + types per feature), thin `src/app/*` pages that compose them. Public/non-interactive pages are Server Components hitting the API directly; protected/interactive flows are Client Components using TanStack Query. Styling is Material UI with a custom theme (Tailwind removed).

**Tech Stack:** Next.js App Router, React 19, TanStack Query, React Hook Form + Zod, MUI (`@mui/material`, `@emotion/react`/`styled`), `qrcode.react`, `html5-qrcode`, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-20-frontend-eventos-ingressos-design.md`

## Global Constraints

- API base URL comes from `NEXT_PUBLIC_API_URL` (already `http://localhost:3000/api` in `.env.local`). Every request needs `credentials: "include"` — already the case in `src/shared/api-client/index.ts`.
- Error envelope from the backend: `{ statusCode, error, message, path, timestamp }`, `message` is `string | string[]`. `ApiError` must expose `statusCode: number`, `error: string`, and both `.message: string` (Error-compatible, joined if array) and `.details: string | string[]` (raw).
- Pagination envelope, uniform across `/events`, `/events/mine`, `/tickets/mine`, `/catalog/movies`: `{ data: T[], meta: { page, limit, total, totalPages } }`.
- Enum values must match the backend exactly: `UserRole` = `"organizer" | "client" | "gatekeeper"`; `SeatStatus` = `"available" | "held" | "sold"`; `ReservationStatus` = `"pending_payment" | "processing" | "confirmed" | "cancelled" | "declined"`; `TicketStatus` = `"valid" | "used"`.
- One reservation = one seat = one ticket = one payment. No cart, no multi-seat selection.
- SSE connections must use `new EventSource(url, { withCredentials: true })` — required for the auth cookie to ride cross-origin (web on `:3001`, API on `:3000`).
- `GET /api/reservations/:id` is being added to the backend separately (outside this plan) with the shape documented in Task 10 — build against that contract.
- Component tests that need React Query/Toast/Theme context use `renderWithProviders` from `test/support/render-with-providers.tsx` (added in Task 3), not hand-rolled providers.
- The test environment runs pinned to UTC (`test/support/setup.ts`, Task 3) so `datetime-local` → `Date` → `toISOString()` conversions (used in Task 15's create-event form) produce deterministic, machine-independent results in tests. Any test asserting on an ISO string derived from a local-time input relies on this.
- Run `npm test -- --run <file>` (vitest) to check a single spec; `npm test` for the full suite. Test files are colocated as `*.spec.ts`/`*.spec.tsx` next to the code they cover (matches `vitest.config.mts`'s `include: ['src/**/*.spec.{ts,tsx}']`).
- Never invent backend behavior not covered by the spec's API contract — if a task needs something the backend doesn't provide, flag it instead of guessing.

---

### Task 1: Swap Tailwind for a custom Material UI theme

**Files:**
- Modify: `package.json` (remove `tailwindcss`, `@tailwindcss/postcss`; add `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`)
- Delete: `postcss.config.mjs`
- Modify: `src/app/globals.css`
- Create: `src/shared/theme/theme.ts`
- Create: `src/shared/providers/emotion-cache-provider.tsx`
- Create: `src/shared/providers/theme-provider.tsx`
- Test: `src/shared/providers/theme-provider.spec.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: `ThemeProvider` (default export style, named export `ThemeProvider`) from `@/shared/providers/theme-provider`, wrapping children with Emotion SSR cache + MUI `ThemeProvider` + `CssBaseline`. `theme` (MUI `Theme`) from `@/shared/theme/theme`, placeholder palette for now — replaced with the real identity in Task 18.

- [ ] **Step 1: Install MUI, remove Tailwind**

```bash
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
npm uninstall tailwindcss @tailwindcss/postcss
rm postcss.config.mjs
```

- [ ] **Step 2: Write the Emotion SSR cache provider**

`src/shared/providers/emotion-cache-provider.tsx`:

```tsx
"use client";

import * as React from "react";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { useServerInsertedHTML } from "next/navigation";

export function EmotionCacheProvider({ children }: { children: React.ReactNode }) {
  const [{ cache, flush }] = React.useState(() => {
    const cache = createCache({ key: "mui" });
    cache.compat = true;
    const prevInsert = cache.insert;
    let inserted: string[] = [];
    cache.insert = (...args) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };
    const flush = () => {
      const prevInserted = inserted;
      inserted = [];
      return prevInserted;
    };
    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) return null;
    let styles = "";
    for (const name of names) {
      styles += cache.inserted[name];
    }
    return (
      <style
        key="mui"
        data-emotion={`${cache.key} ${names.join(" ")}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
```

This is the manual pattern MUI's own Next.js App Router integration package wraps — implementing it directly avoids depending on a version-specific subpath export we can't verify ahead of time (`AGENTS.md` in this repo warns this Next.js version has unverified breaking changes vs. training data; better to use only stable, well-documented App Router APIs like `useServerInsertedHTML`, present since Next 13.4).

- [ ] **Step 3: Write the placeholder theme**

`src/shared/theme/theme.ts`:

```ts
import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
  },
  typography: {
    fontFamily: "var(--font-geist-sans), Arial, Helvetica, sans-serif",
  },
});
```

- [ ] **Step 4: Write the ThemeProvider**

`src/shared/providers/theme-provider.tsx`:

```tsx
"use client";

import * as React from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { EmotionCacheProvider } from "./emotion-cache-provider";
import { theme } from "@/shared/theme/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <EmotionCacheProvider>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </EmotionCacheProvider>
  );
}
```

- [ ] **Step 5: Write the smoke test**

`src/shared/providers/theme-provider.spec.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "./theme-provider";

describe("ThemeProvider", () => {
  it("renders children under the MUI theme without crashing", () => {
    render(
      <ThemeProvider>
        <p>conteudo</p>
      </ThemeProvider>,
    );
    expect(screen.getByText("conteudo")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the test**

Run: `npm test -- --run src/shared/providers/theme-provider.spec.tsx`
Expected: PASS

- [ ] **Step 7: Replace Tailwind directives in globals.css**

`src/app/globals.css`:

```css
:root {
  color-scheme: light;
}
```

- [ ] **Step 8: Wire ThemeProvider into the root layout**

Modify `src/app/layout.tsx` — replace the `QueryProvider`-only wrapping and drop the Tailwind utility classes from `<body>` (CssBaseline handles the reset now):

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/shared/providers/theme-provider";
import { QueryProvider } from "@/shared/providers/query-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Case Verzel — Eventos e Ingressos",
  description: "Plataforma de eventos e ingressos",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Verify the app still builds and runs**

Run: `npm run build`
Expected: build succeeds with no Tailwind-related errors.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: swap Tailwind for a custom Material UI theme"
```

---

### Task 2: API client — refresh-on-401 interceptor

**Files:**
- Modify: `src/shared/api-client/index.ts`
- Modify: `src/shared/api-client/index.spec.ts` (extend existing tests)

**Interfaces:**
- Produces: `ApiError` now has `statusCode: number`, `error: string`, `details: string | string[]`, and inherited `message: string` (joined with `"; "` when `details` is an array). `apiClient.get/post/patch/delete` signatures unchanged. Behavior: any request that gets a `401` (other than requests to `/auth/refresh`, `/auth/login`, `/auth/logout`, `/auth/register`) triggers one `POST /auth/refresh` (deduplicated across concurrent 401s) and retries the original request once; if refresh fails, the original 401 `ApiError` is thrown.

- [ ] **Step 1: Extend the failing tests first**

Add to `src/shared/api-client/index.spec.ts` (keep the existing tests, add these inside the same `describe("apiClient", ...)` block):

```ts
  it("retries the original request after a successful refresh on 401", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: "UNAUTHORIZED", message: "Token expired" }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: "1" }) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiClient.get<{ id: string }>("/tickets/mine");

    expect(result).toEqual({ id: "1" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const refreshCall = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(refreshCall[0].endsWith("/auth/refresh")).toBe(true);
    expect(refreshCall[1].method).toBe("POST");
  });

  it("does not attempt refresh when the 401 comes from the login endpoint itself", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ error: "UNAUTHORIZED", message: "Invalid credentials" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiClient.post("/auth/login", { email: "a@a.com", password: "x" }),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("propagates the original 401 when the refresh call itself fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: "UNAUTHORIZED", message: "Token expired" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({}),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiClient.get("/tickets/mine")).rejects.toMatchObject({
      statusCode: 401,
      error: "UNAUTHORIZED",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("dedupes concurrent refresh calls into a single request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: "UNAUTHORIZED", message: "x" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: "UNAUTHORIZED", message: "x" }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ a: 1 }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ b: 2 }) });
    vi.stubGlobal("fetch", fetchMock);

    const [a, b] = await Promise.all([
      apiClient.get("/tickets/mine"),
      apiClient.get("/events/mine"),
    ]);

    expect(a).toEqual({ a: 1 });
    expect(b).toEqual({ b: 2 });
    const refreshCalls = fetchMock.mock.calls.filter(([url]) =>
      (url as string).endsWith("/auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it("keeps details as an array and joins message for VALIDATION_ERROR responses", async () => {
    mockFetchOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({
        error: "VALIDATION_ERROR",
        message: ["email: Invalid email", "password: Too short"],
      }),
    });

    const error = await apiClient.get("/events").catch((e: unknown) => e);

    expect(error).toMatchObject({ statusCode: 400, error: "VALIDATION_ERROR" });
    expect((error as ApiError).details).toEqual(["email: Invalid email", "password: Too short"]);
    expect((error as ApiError).message).toBe("email: Invalid email; password: Too short");
  });
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `npm test -- --run src/shared/api-client/index.spec.ts`
Expected: the 5 new tests FAIL (no refresh/dedup logic yet, `details` doesn't exist), the original tests still PASS.

- [ ] **Step 3: Implement the interceptor**

Replace `src/shared/api-client/index.ts` with:

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly error: string,
    public readonly details: string | string[],
  ) {
    super(Array.isArray(details) ? details.join("; ") : details);
  }
}

const NO_REFRESH_PREFIXES = ["/auth/refresh", "/auth/login", "/auth/logout", "/auth/register"];

let refreshPromise: Promise<void> | null = null;

function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) throw new Error("refresh failed");
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function parseErrorBody(response: Response) {
  const body = await response.json().catch(() => null);
  return {
    error: body?.error ?? "UNKNOWN_ERROR",
    message: body?.message ?? response.statusText,
  };
}

async function request<T>(path: string, init?: RequestInit, isRetry = false): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const canRefresh = !isRetry && !NO_REFRESH_PREFIXES.some((prefix) => path.startsWith(prefix));
    if (response.status === 401 && canRefresh) {
      try {
        await refreshSession();
        return request<T>(path, init, true);
      } catch {
        // fall through and throw the original 401 below
      }
    }

    const { error, message } = await parseErrorBody(response);
    throw new ApiError(response.status, error, message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- --run src/shared/api-client/index.spec.ts`
Expected: PASS (9 tests: 4 original + 5 new)

- [ ] **Step 5: Commit**

```bash
git add src/shared/api-client
git commit -m "feat: add refresh-on-401 interceptor to api-client"
```

---

### Task 3: Shared utilities — pagination type, error-message mapper, toast provider, test helper

**Files:**
- Create: `src/shared/api-client/pagination.ts`
- Create: `src/shared/api-client/error-messages.ts`
- Test: `src/shared/api-client/error-messages.spec.ts`
- Create: `src/shared/ui/toast-provider.tsx`
- Test: `src/shared/ui/toast-provider.spec.tsx`
- Create: `test/support/render-with-providers.tsx`
- Modify: `test/support/setup.ts` (pin test timezone to UTC)
- Modify: `tsconfig.json` (add `@test/*` path alias)
- Modify: `src/app/layout.tsx` (wire in `ToastProvider`)

**Interfaces:**
- Consumes: `ApiError` from `@/shared/api-client` (Task 2). `ThemeProvider` from `@/shared/providers/theme-provider` (Task 1).
- Produces: `Paginated<T>`, `PaginationMeta` from `@/shared/api-client/pagination`. `getErrorMessage(error: unknown, overrides?: Partial<Record<string, string>>): string` and `getValidationFieldErrors(error: unknown): Record<string, string> | null` from `@/shared/api-client/error-messages`. `ToastProvider`, `useToast(): { showToast: (message: string, severity?: "success" | "error" | "warning" | "info") => void }` from `@/shared/ui/toast-provider`. `renderWithProviders(ui: ReactElement)` from `@test/support/render-with-providers` (wraps in `ThemeProvider` + `QueryClientProvider` + `ToastProvider`) — every later component test task uses this instead of hand-rolled providers. `test/support/setup.ts` pins `process.env.TZ = "UTC"` so every later test's local-time-derived `Date`/`toISOString()` behavior is machine-independent.

- [ ] **Step 1: Write the pagination type**

`src/shared/api-client/pagination.ts`:

```ts
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}
```

- [ ] **Step 2: Write the failing test for the error-message mapper**

`src/shared/api-client/error-messages.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ApiError } from "./index";
import { getErrorMessage, getValidationFieldErrors } from "./error-messages";

describe("getErrorMessage", () => {
  it("returns a context-specific override when provided", () => {
    const error = new ApiError(409, "CONFLICT", "seat gone");
    expect(getErrorMessage(error, { CONFLICT: "assento indisponível" })).toBe(
      "assento indisponível",
    );
  });

  it("falls back to the generic message for the error code", () => {
    const error = new ApiError(401, "UNAUTHORIZED", "expired");
    expect(getErrorMessage(error)).toBe("Sua sessão expirou. Faça login novamente.");
  });

  it("returns a generic fallback for unknown error codes", () => {
    const error = new ApiError(500, "SOMETHING_WEIRD", "boom");
    expect(getErrorMessage(error)).toBe("Algo deu errado. Tente novamente.");
  });

  it("returns a generic fallback for non-ApiError values", () => {
    expect(getErrorMessage(new Error("network down"))).toBe("Algo deu errado. Tente novamente.");
  });
});

describe("getValidationFieldErrors", () => {
  it("parses 'field: message' entries into a field map", () => {
    const error = new ApiError(400, "VALIDATION_ERROR", [
      "email: Invalid email",
      "password: Too short",
    ]);
    expect(getValidationFieldErrors(error)).toEqual({
      email: "Invalid email",
      password: "Too short",
    });
  });

  it("returns null when the error is not a VALIDATION_ERROR", () => {
    const error = new ApiError(409, "CONFLICT", "seat gone");
    expect(getValidationFieldErrors(error)).toBeNull();
  });

  it("returns null when no entry matches the 'field: message' shape", () => {
    const error = new ApiError(400, "VALIDATION_ERROR", "generic message");
    expect(getValidationFieldErrors(error)).toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- --run src/shared/api-client/error-messages.spec.ts`
Expected: FAIL (module doesn't exist)

- [ ] **Step 4: Implement the mapper**

`src/shared/api-client/error-messages.ts`:

```ts
import { ApiError } from "./index";

const GENERIC_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Sua sessão expirou. Faça login novamente.",
  FORBIDDEN: "Você não tem permissão para fazer isso.",
  NOT_FOUND: "Não encontramos o que você procurava.",
  CONFLICT: "Essa ação não pôde ser concluída porque o estado mudou.",
  VALIDATION_ERROR: "Verifique os dados informados.",
  SERVICE_UNAVAILABLE: "Serviço indisponível no momento. Tente novamente em instantes.",
};

const FALLBACK_MESSAGE = "Algo deu errado. Tente novamente.";

export function getErrorMessage(
  error: unknown,
  overrides?: Partial<Record<string, string>>,
): string {
  if (!(error instanceof ApiError)) return FALLBACK_MESSAGE;
  return overrides?.[error.error] ?? GENERIC_MESSAGES[error.error] ?? FALLBACK_MESSAGE;
}

export function getValidationFieldErrors(error: unknown): Record<string, string> | null {
  if (!(error instanceof ApiError) || error.error !== "VALIDATION_ERROR") return null;

  const issues = Array.isArray(error.details) ? error.details : [error.details];
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const separatorIndex = issue.indexOf(": ");
    if (separatorIndex === -1) continue;
    fields[issue.slice(0, separatorIndex)] = issue.slice(separatorIndex + 2);
  }
  return Object.keys(fields).length > 0 ? fields : null;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- --run src/shared/api-client/error-messages.spec.ts`
Expected: PASS

- [ ] **Step 6: Write the failing test for ToastProvider**

`src/shared/ui/toast-provider.spec.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "./toast-provider";

function Consumer() {
  const { showToast } = useToast();
  return <button onClick={() => showToast("deu erro")}>disparar</button>;
}

describe("ToastProvider", () => {
  it("shows a toast message when showToast is called", async () => {
    render(
      <ToastProvider>
        <Consumer />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "disparar" }));
    expect(await screen.findByText("deu erro")).toBeInTheDocument();
  });

  it("throws when useToast is used outside a ToastProvider", () => {
    function Broken() {
      useToast();
      return null;
    }
    expect(() => render(<Broken />)).toThrow("useToast must be used within a ToastProvider");
  });
});
```

- [ ] **Step 7: Run to verify it fails**

Run: `npm test -- --run src/shared/ui/toast-provider.spec.tsx`
Expected: FAIL (module doesn't exist)

- [ ] **Step 8: Implement ToastProvider**

`src/shared/ui/toast-provider.tsx`:

```tsx
"use client";

import * as React from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert, { AlertColor } from "@mui/material/Alert";

interface ToastState {
  message: string;
  severity: AlertColor;
}

interface ToastContextValue {
  showToast: (message: string, severity?: AlertColor) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = React.useState<ToastState | null>(null);

  const showToast = React.useCallback((message: string, severity: AlertColor = "error") => {
    setToast({ message, severity });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={toast !== null}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}
```

- [ ] **Step 9: Run to verify it passes**

Run: `npm test -- --run src/shared/ui/toast-provider.spec.tsx`
Expected: PASS

- [ ] **Step 10: Add the `@test/*` path alias**

In `tsconfig.json`, under `compilerOptions.paths`, add the new entry next to the existing one:

```json
    "paths": {
      "@/*": ["./src/*"],
      "@test/*": ["./test/*"]
    }
```

- [ ] **Step 11: Pin the test environment to UTC**

Modify `test/support/setup.ts` to set the timezone before anything else runs, so `Date`-based tests (e.g. the `datetime-local` → ISO conversion in Task 15's create-event form) are deterministic regardless of the machine running them:

```ts
process.env.TZ = "UTC";

import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 12: Write the shared test render helper**

`test/support/render-with-providers.tsx`:

```tsx
import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/shared/providers/theme-provider";
import { ToastProvider } from "@/shared/ui/toast-provider";

export function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}
```

- [ ] **Step 13: Wire ToastProvider into the root layout**

Modify `src/app/layout.tsx` — nest `ToastProvider` inside `QueryProvider`:

```tsx
        <ThemeProvider>
          <QueryProvider>
            <ToastProvider>{children}</ToastProvider>
          </QueryProvider>
        </ThemeProvider>
```

Add the import: `import { ToastProvider } from "@/shared/ui/toast-provider";`

- [ ] **Step 14: Run the full suite and commit**

Run: `npm test`
Expected: all PASS

```bash
git add -A
git commit -m "feat: add pagination type, error-message mapper, and toast provider"
```

---

### Task 4: Auth — types, api, useCurrentUser, RoleGate

**Files:**
- Create: `src/features/auth/types.ts`
- Create: `src/features/auth/api/auth-api.ts`
- Create: `src/features/auth/api/use-current-user.ts`
- Create: `src/features/auth/components/role-gate.tsx`
- Test: `src/features/auth/components/role-gate.spec.tsx`

**Interfaces:**
- Consumes: `apiClient` from `@/shared/api-client` (existing/Task 2).
- Produces: `UserRole`, `User` from `@/features/auth/types`. `authApi.login(input: LoginInput): Promise<User>`, `authApi.register(input: RegisterInput): Promise<User>`, `authApi.logout(): Promise<void>`, `authApi.getMe(): Promise<User>` from `@/features/auth/api/auth-api` — used by later auth-form tasks. `useCurrentUser()` (React Query, key `["auth", "me"]`) from `@/features/auth/api/use-current-user` — used by `RoleGate` and later by pages that need to know who's logged in. `RoleGate({ role: UserRole, children: ReactNode })` from `@/features/auth/components/role-gate` — used to wrap every protected page (`organizador/*`, `meus-ingressos`, `portaria`, `checkout/*`).

- [ ] **Step 1: Write the auth types**

`src/features/auth/types.ts`:

```ts
export type UserRole = "organizer" | "client" | "gatekeeper";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
```

- [ ] **Step 2: Write the auth API functions**

`src/features/auth/api/auth-api.ts`:

```ts
import { apiClient } from "@/shared/api-client";
import { User } from "../types";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: "client" | "organizer";
}

export const authApi = {
  login: (input: LoginInput) => apiClient.post<User>("/auth/login", input),
  register: (input: RegisterInput) => apiClient.post<User>("/auth/register", input),
  logout: () => apiClient.post<void>("/auth/logout"),
  getMe: () => apiClient.get<User>("/auth/me"),
};
```

- [ ] **Step 3: Write the useCurrentUser hook**

`src/features/auth/api/use-current-user.ts`:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { authApi } from "./auth-api";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.getMe,
    retry: false,
    staleTime: 60_000,
  });
}
```

- [ ] **Step 4: Write the failing test for RoleGate**

`src/features/auth/components/role-gate.spec.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const useCurrentUserMock = vi.fn();
vi.mock("../api/use-current-user", () => ({
  useCurrentUser: () => useCurrentUserMock(),
}));

import { RoleGate } from "./role-gate";

describe("RoleGate", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    useCurrentUserMock.mockReset();
  });

  it("renders children when the user has the required role", () => {
    useCurrentUserMock.mockReturnValue({
      data: { id: "1", name: "Ana", email: "a@a.com", role: "organizer" },
      isLoading: false,
      isError: false,
    });

    render(
      <RoleGate role="organizer">
        <p>conteúdo protegido</p>
      </RoleGate>,
    );

    expect(screen.getByText("conteúdo protegido")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to /login when there is no authenticated user", () => {
    useCurrentUserMock.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    render(
      <RoleGate role="organizer">
        <p>conteúdo protegido</p>
      </RoleGate>,
    );

    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("redirects home when the user has a different role", () => {
    useCurrentUserMock.mockReturnValue({
      data: { id: "1", name: "Ana", email: "a@a.com", role: "client" },
      isLoading: false,
      isError: false,
    });

    render(
      <RoleGate role="organizer">
        <p>conteúdo protegido</p>
      </RoleGate>,
    );

    expect(replaceMock).toHaveBeenCalledWith("/");
  });

  it("shows a loading state while the user is being fetched", () => {
    useCurrentUserMock.mockReturnValue({ data: undefined, isLoading: true, isError: false });

    render(
      <RoleGate role="organizer">
        <p>conteúdo protegido</p>
      </RoleGate>,
    );

    expect(screen.queryByText("conteúdo protegido")).not.toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Run to verify it fails**

Run: `npm test -- --run src/features/auth/components/role-gate.spec.tsx`
Expected: FAIL (module doesn't exist)

- [ ] **Step 6: Implement RoleGate**

`src/features/auth/components/role-gate.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useCurrentUser } from "../api/use-current-user";
import { UserRole } from "../types";

export function RoleGate({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading, isError } = useCurrentUser();

  useEffect(() => {
    if (isLoading) return;
    if (isError || !user) {
      router.replace("/login");
      return;
    }
    if (user.role !== role) {
      router.replace("/");
    }
  }, [isLoading, isError, user, role, router]);

  if (isLoading || isError || !user || user.role !== role) {
    return (
      <Box display="flex" justifyContent="center" p={8}>
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 7: Run to verify it passes**

Run: `npm test -- --run src/features/auth/components/role-gate.spec.tsx`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/features/auth
git commit -m "feat: add auth types, api, useCurrentUser and RoleGate"
```

---

### Task 5: Login page and form

**Files:**
- Create: `src/features/auth/components/login-form.tsx`
- Test: `src/features/auth/components/login-form.spec.tsx`
- Modify: `src/app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `authApi.login` (Task 4), `useToast`/`getErrorMessage` (Task 3), `renderWithProviders` (Task 3, test-only).
- Produces: `LoginForm` (no props) from `@/features/auth/components/login-form`.

- [ ] **Step 1: Write the failing test**

`src/features/auth/components/login-form.spec.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@test/support/render-with-providers";
import { ApiError } from "@/shared/api-client";

const replaceMock = vi.fn();
const searchParamsGetMock = vi.fn(() => null);
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => ({ get: searchParamsGetMock }),
}));

const loginMock = vi.fn();
vi.mock("../api/auth-api", () => ({
  authApi: { login: (...args: unknown[]) => loginMock(...args) },
}));

import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    searchParamsGetMock.mockReturnValue(null);
    loginMock.mockReset();
  });

  it("shows a validation error for an empty submit", async () => {
    renderWithProviders(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Informe um e-mail válido")).toBeInTheDocument();
  });

  it("logs in and redirects to the requested page on success", async () => {
    loginMock.mockResolvedValue({ id: "1", name: "Ana", email: "ana@verzel.com", role: "client" });
    searchParamsGetMock.mockReturnValue("/meus-ingressos");
    renderWithProviders(<LoginForm />);

    await userEvent.type(screen.getByLabelText("E-mail"), "ana@verzel.com");
    await userEvent.type(screen.getByLabelText("Senha"), "senha123");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/meus-ingressos"));
  });

  it("shows a toast with a friendly message on invalid credentials", async () => {
    loginMock.mockRejectedValue(new ApiError(401, "UNAUTHORIZED", "Invalid credentials"));
    renderWithProviders(<LoginForm />);

    await userEvent.type(screen.getByLabelText("E-mail"), "ana@verzel.com");
    await userEvent.type(screen.getByLabelText("Senha"), "errada");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --run src/features/auth/components/login-form.spec.tsx`
Expected: FAIL (module doesn't exist)

- [ ] **Step 3: Implement LoginForm**

`src/features/auth/components/login-form.tsx`:

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { authApi } from "../api/auth-api";
import { useToast } from "@/shared/ui/toast-provider";
import { getErrorMessage } from "@/shared/api-client/error-messages";

const schema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe a senha"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (user) => {
      queryClient.setQueryData(["auth", "me"], user);
      router.replace(searchParams.get("redirectTo") ?? "/");
    },
    onError: (error) => {
      showToast(getErrorMessage(error, { UNAUTHORIZED: "E-mail ou senha incorretos." }));
    },
  });

  return (
    <Box
      component="form"
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 360 }}
    >
      <TextField
        label="E-mail"
        type="email"
        error={!!errors.email}
        helperText={errors.email?.message}
        {...register("email")}
      />
      <TextField
        label="Senha"
        type="password"
        error={!!errors.password}
        helperText={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" variant="contained" disabled={mutation.isPending}>
        Entrar
      </Button>
    </Box>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- --run src/features/auth/components/login-form.spec.tsx`
Expected: PASS

- [ ] **Step 5: Wire the page**

`src/app/(auth)/login/page.tsx`:

```tsx
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <Box component="main" sx={{ flex: 1, p: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Entrar
      </Typography>
      <LoginForm />
    </Box>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/features/auth src/app/\(auth\)/login
git commit -m "feat: implement login page"
```

---

### Task 6: Register page and form

**Files:**
- Create: `src/features/auth/components/register-form.tsx`
- Test: `src/features/auth/components/register-form.spec.tsx`
- Modify: `src/app/(auth)/registro/page.tsx`

**Interfaces:**
- Consumes: `authApi.register` (Task 4), `useToast`/`getErrorMessage` (Task 3), `renderWithProviders` (Task 3, test-only).
- Produces: `RegisterForm` (no props) from `@/features/auth/components/register-form`.

Per the backend contract, `RegisterInput.role` only accepts `"client" | "organizer"` — `gatekeeper` is seed-only and not selectable here.

- [ ] **Step 1: Write the failing test**

`src/features/auth/components/register-form.spec.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@test/support/render-with-providers";
import { ApiError } from "@/shared/api-client";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const registerMock = vi.fn();
vi.mock("../api/auth-api", () => ({
  authApi: { register: (...args: unknown[]) => registerMock(...args) },
}));

import { RegisterForm } from "./register-form";

describe("RegisterForm", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    registerMock.mockReset();
  });

  it("shows validation errors for a short password", async () => {
    renderWithProviders(<RegisterForm />);
    await userEvent.type(screen.getByLabelText("Senha"), "1234567");
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(await screen.findByText("A senha precisa ter pelo menos 8 caracteres")).toBeInTheDocument();
  });

  it("registers with the chosen role and redirects home on success", async () => {
    registerMock.mockResolvedValue({
      id: "1",
      name: "Ana",
      email: "ana@verzel.com",
      role: "organizer",
    });
    renderWithProviders(<RegisterForm />);

    await userEvent.type(screen.getByLabelText("Nome"), "Ana");
    await userEvent.type(screen.getByLabelText("E-mail"), "ana@verzel.com");
    await userEvent.type(screen.getByLabelText("Senha"), "senha123");
    await userEvent.click(screen.getByLabelText("Organizador"));
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() =>
      expect(registerMock).toHaveBeenCalledWith({
        name: "Ana",
        email: "ana@verzel.com",
        password: "senha123",
        role: "organizer",
      }),
    );
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
  });

  it("shows a toast when the email is already registered", async () => {
    registerMock.mockRejectedValue(new ApiError(409, "CONFLICT", "email in use"));
    renderWithProviders(<RegisterForm />);

    await userEvent.type(screen.getByLabelText("Nome"), "Ana");
    await userEvent.type(screen.getByLabelText("E-mail"), "ana@verzel.com");
    await userEvent.type(screen.getByLabelText("Senha"), "senha123");
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByText("Esse e-mail já está cadastrado.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --run src/features/auth/components/register-form.spec.tsx`
Expected: FAIL (module doesn't exist)

- [ ] **Step 3: Implement RegisterForm**

`src/features/auth/components/register-form.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import { authApi } from "../api/auth-api";
import { useToast } from "@/shared/ui/toast-provider";
import { getErrorMessage } from "@/shared/api-client/error-messages";

const schema = z.object({
  name: z.string().min(2, "Informe seu nome"),
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
  role: z.enum(["client", "organizer"]),
});

type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "client" },
  });

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => router.replace("/"),
    onError: (error) => {
      showToast(getErrorMessage(error, { CONFLICT: "Esse e-mail já está cadastrado." }));
    },
  });

  return (
    <Box
      component="form"
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 360 }}
    >
      <TextField
        label="Nome"
        error={!!errors.name}
        helperText={errors.name?.message}
        {...register("name")}
      />
      <TextField
        label="E-mail"
        type="email"
        error={!!errors.email}
        helperText={errors.email?.message}
        {...register("email")}
      />
      <TextField
        label="Senha"
        type="password"
        error={!!errors.password}
        helperText={errors.password?.message}
        {...register("password")}
      />
      <FormControl>
        <FormLabel id="role-label">Quero me cadastrar como</FormLabel>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <RadioGroup {...field} aria-labelledby="role-label">
              <FormControlLabel value="client" control={<Radio />} label="Cliente" />
              <FormControlLabel value="organizer" control={<Radio />} label="Organizador" />
            </RadioGroup>
          )}
        />
      </FormControl>
      <Button type="submit" variant="contained" disabled={mutation.isPending}>
        Criar conta
      </Button>
    </Box>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- --run src/features/auth/components/register-form.spec.tsx`
Expected: PASS

- [ ] **Step 5: Wire the page**

`src/app/(auth)/registro/page.tsx`:

```tsx
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <Box component="main" sx={{ flex: 1, p: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Criar conta
      </Typography>
      <RegisterForm />
    </Box>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/features/auth src/app/\(auth\)/registro
git commit -m "feat: implement register page"
```

---

### Task 7: Public events catalog — types, api, list page

**Files:**
- Create: `src/features/events/types.ts`
- Create: `src/features/events/api/events-api.ts`
- Create: `src/features/events/components/event-card.tsx`
- Test: `src/features/events/components/event-card.spec.tsx`
- Modify: `src/app/(public)/page.tsx`
- Test: `src/app/(public)/page.spec.tsx`

**Interfaces:**
- Consumes: `apiClient` (Task 2), `Paginated<T>` (Task 3).
- Produces: `EventSummary`, `SeatStatus`, `Seat`, `EventDetail`, `CreateEventInput` from `@/features/events/types` — used throughout the rest of the plan (reservations, organizer, gatekeeper). `eventsApi.list(page?: number): Promise<Paginated<EventSummary>>`, `eventsApi.get(id: string): Promise<EventDetail>`, `eventsApi.listMine(page?: number): Promise<Paginated<EventSummary>>`, `eventsApi.create(input: CreateEventInput): Promise<EventSummary>` from `@/features/events/api/events-api`. `EventCard({ event: EventSummary })` from `@/features/events/components/event-card`.

- [ ] **Step 1: Write the event types**

`src/features/events/types.ts`:

```ts
export interface EventSummary {
  id: string;
  organizerId: string;
  title: string;
  synopsis: string | null;
  posterUrl: string | null;
  tmdbId: string;
  date: string;
  location: string;
  capacity: number;
  price: string;
  createdAt: string;
}

export type SeatStatus = "available" | "held" | "sold";

export interface Seat {
  id: string;
  row: string;
  number: number;
  label: string;
  status: SeatStatus;
}

export interface EventDetail extends EventSummary {
  seats: Seat[];
}

export interface CreateEventInput {
  tmdbId: string;
  date: string;
  location: string;
  capacity: number;
  price: string;
}
```

- [ ] **Step 2: Write the events API**

`src/features/events/api/events-api.ts`:

```ts
import { apiClient } from "@/shared/api-client";
import { Paginated } from "@/shared/api-client/pagination";
import { CreateEventInput, EventDetail, EventSummary } from "../types";

export const eventsApi = {
  list: (page = 1) => apiClient.get<Paginated<EventSummary>>(`/events?page=${page}`),
  get: (id: string) => apiClient.get<EventDetail>(`/events/${id}`),
  listMine: (page = 1) => apiClient.get<Paginated<EventSummary>>(`/events/mine?page=${page}`),
  create: (input: CreateEventInput) => apiClient.post<EventSummary>("/events", input),
};
```

- [ ] **Step 3: Write the failing test for EventCard**

`src/features/events/components/event-card.spec.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventCard } from "./event-card";
import { EventSummary } from "../types";

const event: EventSummary = {
  id: "1",
  organizerId: "org-1",
  title: "Homem-Aranha: Um Novo Dia",
  synopsis: null,
  posterUrl: null,
  tmdbId: "969681",
  date: "2026-09-01T22:00:00Z",
  location: "Cinema Verzel - Sala 3",
  capacity: 24,
  price: "39.90",
  createdAt: "2026-08-01T00:00:00Z",
};

describe("EventCard", () => {
  it("renders the event title, location and formatted price", () => {
    render(<EventCard event={event} />);
    expect(screen.getByText("Homem-Aranha: Um Novo Dia")).toBeInTheDocument();
    expect(screen.getByText(/Cinema Verzel - Sala 3/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?39,90/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `npm test -- --run src/features/events/components/event-card.spec.tsx`
Expected: FAIL (module doesn't exist)

- [ ] **Step 5: Implement EventCard**

`src/features/events/components/event-card.tsx`:

```tsx
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { EventSummary } from "../types";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(iso),
  );
}

function formatPrice(price: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(price),
  );
}

export function EventCard({ event }: { event: EventSummary }) {
  return (
    <Card component={Link} href={`/eventos/${event.id}`} sx={{ textDecoration: "none", width: 240 }}>
      <CardActionArea>
        {event.posterUrl ? (
          <CardMedia
            component="img"
            image={event.posterUrl}
            alt={event.title}
            sx={{ aspectRatio: "2 / 3" }}
          />
        ) : null}
        <CardContent>
          <Typography variant="subtitle1" component="h3">
            {event.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDate(event.date)} · {event.location}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatPrice(event.price)}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `npm test -- --run src/features/events/components/event-card.spec.tsx`
Expected: PASS

- [ ] **Step 7: Write the failing test for the events list page**

`src/app/(public)/page.spec.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/features/events/api/events-api", () => ({
  eventsApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        {
          id: "1",
          organizerId: "org-1",
          title: "Homem-Aranha: Um Novo Dia",
          synopsis: null,
          posterUrl: null,
          tmdbId: "969681",
          date: "2026-09-01T22:00:00Z",
          location: "Cinema Verzel - Sala 3",
          capacity: 24,
          price: "39.90",
          createdAt: "2026-08-01T00:00:00Z",
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
  },
}));

import EventsPage from "./page";

describe("EventsPage", () => {
  it("renders the published events returned by the API", async () => {
    render(await EventsPage());
    expect(screen.getByText("Homem-Aranha: Um Novo Dia")).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run to verify it fails**

Run: `npm test -- --run "src/app/(public)/page.spec.tsx"`
Expected: FAIL (page still renders the old stub markup, no event title)

- [ ] **Step 9: Implement the events list page**

`src/app/(public)/page.tsx`:

```tsx
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { eventsApi } from "@/features/events/api/events-api";
import { EventCard } from "@/features/events/components/event-card";

export default async function EventsPage() {
  const { data: events } = await eventsApi.list();

  return (
    <Box component="main" sx={{ flex: 1, p: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Eventos
      </Typography>
      {events.length === 0 ? (
        <Typography>Nenhum evento publicado no momento.</Typography>
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 10: Run to verify it passes**

Run: `npm test -- --run "src/app/(public)/page.spec.tsx"`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add src/features/events "src/app/(public)/page.tsx" "src/app/(public)/page.spec.tsx"
git commit -m "feat: implement public events catalog list"
```

---

### Task 8: Event detail page and seat map

**Files:**
- Create: `src/features/reservations/hooks/use-seat-selection.ts`
- Test: `src/features/reservations/hooks/use-seat-selection.spec.ts`
- Create: `src/features/reservations/components/seat-map.tsx`
- Test: `src/features/reservations/components/seat-map.spec.tsx`
- Create: `src/features/events/components/event-detail-view.tsx`
- Modify: `src/app/(public)/eventos/[id]/page.tsx`

**Interfaces:**
- Consumes: `Seat`, `EventDetail` (Task 7).
- Produces: `useSeatSelection(seats: Seat[]): { selectedSeat: Seat | null; selectSeat: (seatId: string) => void }` from `@/features/reservations/hooks/use-seat-selection` — reused by Task 9's reservation wiring. `SeatMap({ seats: Seat[]; selectedSeatId: string | null; onSelectSeat: (seatId: string) => void })` from `@/features/reservations/components/seat-map` (presentational, controlled — parent owns selection state via the hook above). `EventDetailView({ event: EventDetail })` (client component) from `@/features/events/components/event-detail-view` — owns the seat-selection hook and renders the "reservar" affordance that Task 9 wires up.

- [ ] **Step 1: Write the failing tests for useSeatSelection**

`src/features/reservations/hooks/use-seat-selection.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSeatSelection } from "./use-seat-selection";
import { Seat } from "@/features/events/types";

const seats: Seat[] = [
  { id: "1", row: "A", number: 1, label: "A1", status: "available" },
  { id: "2", row: "A", number: 2, label: "A2", status: "sold" },
  { id: "3", row: "A", number: 3, label: "A3", status: "held" },
];

describe("useSeatSelection", () => {
  it("selects an available seat", () => {
    const { result } = renderHook(() => useSeatSelection(seats));
    act(() => result.current.selectSeat("1"));
    expect(result.current.selectedSeat?.id).toBe("1");
  });

  it("toggles off the same seat when clicked twice", () => {
    const { result } = renderHook(() => useSeatSelection(seats));
    act(() => result.current.selectSeat("1"));
    act(() => result.current.selectSeat("1"));
    expect(result.current.selectedSeat).toBeNull();
  });

  it("ignores clicks on a sold or held seat", () => {
    const { result } = renderHook(() => useSeatSelection(seats));
    act(() => result.current.selectSeat("2"));
    expect(result.current.selectedSeat).toBeNull();
    act(() => result.current.selectSeat("3"));
    expect(result.current.selectedSeat).toBeNull();
  });

  it("switches selection when a different available seat is clicked", () => {
    const seatsWithTwoAvailable: Seat[] = [
      ...seats,
      { id: "4", row: "B", number: 1, label: "B1", status: "available" },
    ];
    const { result } = renderHook(() => useSeatSelection(seatsWithTwoAvailable));
    act(() => result.current.selectSeat("1"));
    act(() => result.current.selectSeat("4"));
    expect(result.current.selectedSeat?.id).toBe("4");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --run src/features/reservations/hooks/use-seat-selection.spec.ts`
Expected: FAIL (module doesn't exist)

- [ ] **Step 3: Implement useSeatSelection**

`src/features/reservations/hooks/use-seat-selection.ts`:

```ts
"use client";

import { useCallback, useState } from "react";
import { Seat } from "@/features/events/types";

export function useSeatSelection(seats: Seat[]) {
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);

  const selectSeat = useCallback(
    (seatId: string) => {
      const seat = seats.find((s) => s.id === seatId);
      if (!seat || seat.status !== "available") return;
      setSelectedSeatId((current) => (current === seatId ? null : seatId));
    },
    [seats],
  );

  const selectedSeat = seats.find((s) => s.id === selectedSeatId) ?? null;

  return { selectedSeat, selectSeat };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- --run src/features/reservations/hooks/use-seat-selection.spec.ts`
Expected: PASS

- [ ] **Step 5: Write the failing test for SeatMap**

`src/features/reservations/components/seat-map.spec.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SeatMap } from "./seat-map";
import { Seat } from "@/features/events/types";

const seats: Seat[] = [
  { id: "1", row: "A", number: 1, label: "A1", status: "available" },
  { id: "2", row: "A", number: 2, label: "A2", status: "sold" },
];

describe("SeatMap", () => {
  it("renders every seat label", () => {
    render(<SeatMap seats={seats} selectedSeatId={null} onSelectSeat={vi.fn()} />);
    expect(screen.getByText("A1")).toBeInTheDocument();
    expect(screen.getByText("A2")).toBeInTheDocument();
  });

  it("calls onSelectSeat with the seat id when an available seat is clicked", async () => {
    const onSelectSeat = vi.fn();
    render(<SeatMap seats={seats} selectedSeatId={null} onSelectSeat={onSelectSeat} />);
    await userEvent.click(screen.getByRole("button", { name: "A1" }));
    expect(onSelectSeat).toHaveBeenCalledWith("1");
  });

  it("disables sold seats", () => {
    render(<SeatMap seats={seats} selectedSeatId={null} onSelectSeat={vi.fn()} />);
    expect(screen.getByRole("button", { name: "A2" })).toBeDisabled();
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npm test -- --run src/features/reservations/components/seat-map.spec.tsx`
Expected: FAIL (module doesn't exist)

- [ ] **Step 7: Implement SeatMap**

`src/features/reservations/components/seat-map.tsx`:

```tsx
"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { Seat } from "@/features/events/types";

function groupByRow(seats: Seat[]): Map<string, Seat[]> {
  const rows = new Map<string, Seat[]>();
  for (const seat of seats) {
    const row = rows.get(seat.row) ?? [];
    row.push(seat);
    rows.set(seat.row, row);
  }
  return rows;
}

export function SeatMap({
  seats,
  selectedSeatId,
  onSelectSeat,
}: {
  seats: Seat[];
  selectedSeatId: string | null;
  onSelectSeat: (seatId: string) => void;
}) {
  const rows = groupByRow(seats);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {[...rows.entries()].map(([row, rowSeats]) => (
        <Box key={row} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Typography variant="body2" sx={{ width: 24 }}>
            {row}
          </Typography>
          {rowSeats
            .sort((a, b) => a.number - b.number)
            .map((seat) => (
              <Button
                key={seat.id}
                aria-label={seat.label}
                variant={selectedSeatId === seat.id ? "contained" : "outlined"}
                color={seat.status === "sold" ? "inherit" : "primary"}
                disabled={seat.status !== "available"}
                onClick={() => onSelectSeat(seat.id)}
                sx={{ minWidth: 40, px: 0 }}
              >
                {seat.number}
              </Button>
            ))}
        </Box>
      ))}
    </Box>
  );
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `npm test -- --run src/features/reservations/components/seat-map.spec.tsx`
Expected: PASS

- [ ] **Step 9: Write EventDetailView (client wrapper owning seat selection)**

`src/features/events/components/event-detail-view.tsx`:

```tsx
"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { EventDetail } from "../types";
import { useSeatSelection } from "@/features/reservations/hooks/use-seat-selection";
import { SeatMap } from "@/features/reservations/components/seat-map";

function formatPrice(price: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(price),
  );
}

export function EventDetailView({ event }: { event: EventDetail }) {
  const { selectedSeat, selectSeat } = useSeatSelection(event.seats);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h4" component="h1">
        {event.title}
      </Typography>
      <Typography color="text.secondary">
        {event.location} · {formatPrice(event.price)}
      </Typography>
      <SeatMap
        seats={event.seats}
        selectedSeatId={selectedSeat?.id ?? null}
        onSelectSeat={selectSeat}
      />
      {selectedSeat ? (
        <Typography>Assento selecionado: {selectedSeat.label}</Typography>
      ) : null}
    </Box>
  );
}
```

Note: the "reservar" button and the `POST /reservations` call are added in Task 9, which extends this same component.

- [ ] **Step 10: Wire the event detail page (Server Component)**

`src/app/(public)/eventos/[id]/page.tsx`:

```tsx
import { eventsApi } from "@/features/events/api/events-api";
import { EventDetailView } from "@/features/events/components/event-detail-view";

export default async function EventDetailPage({ params }: PageProps<"/eventos/[id]">) {
  const { id } = await params;
  const event = await eventsApi.get(id);

  return (
    <main className="flex-1 p-8">
      <EventDetailView event={event} />
    </main>
  );
}
```

- [ ] **Step 11: Run the full suite and commit**

Run: `npm test`
Expected: all PASS

```bash
git add src/features/reservations src/features/events "src/app/(public)/eventos"
git commit -m "feat: implement event detail page with seat map"
```

---

### Task 9: Create-reservation flow

**Files:**
- Create: `src/features/reservations/types.ts`
- Create: `src/features/reservations/api/reservations-api.ts`
- Modify: `src/features/events/components/event-detail-view.tsx`
- Test: `src/features/events/components/event-detail-view.spec.tsx`

**Interfaces:**
- Consumes: `Seat`, `EventDetail` (Task 7), `useSeatSelection`, `SeatMap` (Task 8), `useToast`/`getErrorMessage` (Task 3).
- Produces: `ReservationStatus`, `Reservation` from `@/features/reservations/types` (also used by Task 10's `ReservationDetail`). `reservationsApi.create({ eventId, seatId }): Promise<Reservation>` from `@/features/reservations/api/reservations-api` — the `get` method is added in Task 10.

- [ ] **Step 1: Write the reservation types**

`src/features/reservations/types.ts`:

```ts
export type ReservationStatus =
  | "pending_payment"
  | "processing"
  | "confirmed"
  | "cancelled"
  | "declined";

export interface Reservation {
  id: string;
  eventId: string;
  clientId: string;
  status: ReservationStatus;
  expiresAt: string;
  createdAt: string;
}
```

- [ ] **Step 2: Write the reservations API (create only for now)**

`src/features/reservations/api/reservations-api.ts`:

```ts
import { apiClient } from "@/shared/api-client";
import { Reservation } from "../types";

export interface CreateReservationInput {
  eventId: string;
  seatId: string;
}

export const reservationsApi = {
  create: (input: CreateReservationInput) => apiClient.post<Reservation>("/reservations", input),
};
```

- [ ] **Step 3: Write the failing test for the "reservar" flow**

`src/features/events/components/event-detail-view.spec.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@test/support/render-with-providers";
import { ApiError } from "@/shared/api-client";
import { EventDetail } from "../types";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const createReservationMock = vi.fn();
vi.mock("@/features/reservations/api/reservations-api", () => ({
  reservationsApi: { create: (...args: unknown[]) => createReservationMock(...args) },
}));

import { EventDetailView } from "./event-detail-view";

const event: EventDetail = {
  id: "event-1",
  organizerId: "org-1",
  title: "Homem-Aranha: Um Novo Dia",
  synopsis: null,
  posterUrl: null,
  tmdbId: "969681",
  date: "2026-09-01T22:00:00Z",
  location: "Cinema Verzel - Sala 3",
  capacity: 24,
  price: "39.90",
  createdAt: "2026-08-01T00:00:00Z",
  seats: [{ id: "seat-1", row: "A", number: 1, label: "A1", status: "available" }],
};

describe("EventDetailView reservation flow", () => {
  beforeEach(() => {
    pushMock.mockClear();
    createReservationMock.mockReset();
  });

  it("creates a reservation for the selected seat and navigates to checkout", async () => {
    createReservationMock.mockResolvedValue({
      id: "res-1",
      eventId: "event-1",
      clientId: "client-1",
      status: "pending_payment",
      expiresAt: "2026-09-01T22:10:00Z",
      createdAt: "2026-09-01T22:00:00Z",
    });
    renderWithProviders(<EventDetailView event={event} />);

    await userEvent.click(screen.getByRole("button", { name: "A1" }));
    await userEvent.click(screen.getByRole("button", { name: "Reservar" }));

    await waitFor(() =>
      expect(createReservationMock).toHaveBeenCalledWith({ eventId: "event-1", seatId: "seat-1" }),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/checkout/res-1"));
  });

  it("shows a toast when the seat was just taken by someone else", async () => {
    createReservationMock.mockRejectedValue(new ApiError(409, "CONFLICT", "seat gone"));
    renderWithProviders(<EventDetailView event={event} />);

    await userEvent.click(screen.getByRole("button", { name: "A1" }));
    await userEvent.click(screen.getByRole("button", { name: "Reservar" }));

    expect(
      await screen.findByText("Esse assento acabou de ser reservado por outra pessoa."),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `npm test -- --run src/features/events/components/event-detail-view.spec.tsx`
Expected: FAIL (no "Reservar" button yet)

- [ ] **Step 5: Extend EventDetailView with the reservation mutation**

Replace `src/features/events/components/event-detail-view.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { EventDetail } from "../types";
import { useSeatSelection } from "@/features/reservations/hooks/use-seat-selection";
import { SeatMap } from "@/features/reservations/components/seat-map";
import { reservationsApi } from "@/features/reservations/api/reservations-api";
import { useToast } from "@/shared/ui/toast-provider";
import { getErrorMessage } from "@/shared/api-client/error-messages";

function formatPrice(price: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(price),
  );
}

export function EventDetailView({ event }: { event: EventDetail }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { selectedSeat, selectSeat } = useSeatSelection(event.seats);

  const mutation = useMutation({
    mutationFn: () => reservationsApi.create({ eventId: event.id, seatId: selectedSeat!.id }),
    onSuccess: (reservation) => router.push(`/checkout/${reservation.id}`),
    onError: (error) => {
      showToast(
        getErrorMessage(error, { CONFLICT: "Esse assento acabou de ser reservado por outra pessoa." }),
      );
    },
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h4" component="h1">
        {event.title}
      </Typography>
      <Typography color="text.secondary">
        {event.location} · {formatPrice(event.price)}
      </Typography>
      <SeatMap
        seats={event.seats}
        selectedSeatId={selectedSeat?.id ?? null}
        onSelectSeat={selectSeat}
      />
      {selectedSeat ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography>Assento selecionado: {selectedSeat.label}</Typography>
          <Button
            variant="contained"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Reservar
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `npm test -- --run src/features/events/components/event-detail-view.spec.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/reservations src/features/events
git commit -m "feat: create reservation from selected seat and navigate to checkout"
```

---

### Task 10: Checkout skeleton — reservation query and countdown

**Files:**
- Modify: `src/features/reservations/api/reservations-api.ts` (add `get`)
- Create: `src/features/reservations/hooks/use-countdown.ts`
- Test: `src/features/reservations/hooks/use-countdown.spec.ts`
- Create: `src/features/reservations/components/checkout-view.tsx`
- Test: `src/features/reservations/components/checkout-view.spec.tsx`
- Modify: `src/app/checkout/[reservationId]/page.tsx`

**Interfaces:**
- Consumes: `Reservation`, `ReservationStatus` (Task 9).
- Produces: `ReservationDetail` from `@/features/reservations/types` (added alongside `Reservation`). `reservationsApi.get(id: string): Promise<ReservationDetail>` from `@/features/reservations/api/reservations-api`. `useCountdown(targetIso: string): { secondsLeft: number; isExpired: boolean; formatted: string }` from `@/features/reservations/hooks/use-countdown` — reused by Task 11. `CheckoutView({ reservationId: string })` (client component) from `@/features/reservations/components/checkout-view` — Task 11 extends it with the payment form.

`GET /api/reservations/:id` is the endpoint being added to the backend separately; this task builds against the shape documented in the spec (`docs/superpowers/specs/2026-08-20-frontend-eventos-ingressos-design.md`, section "Reserva e checkout").

- [ ] **Step 1: Add the ReservationDetail type**

Append to `src/features/reservations/types.ts`:

```ts

export interface ReservationDetail {
  id: string;
  status: ReservationStatus;
  expiresAt: string;
  createdAt: string;
  event: {
    id: string;
    title: string;
    posterUrl: string | null;
    date: string;
    location: string;
    price: string;
  };
  seat: { id: string; label: string };
}
```

- [ ] **Step 2: Add reservationsApi.get**

In `src/features/reservations/api/reservations-api.ts`, add the import and method:

```ts
import { Reservation, ReservationDetail } from "../types";
```

```ts
  get: (id: string) => apiClient.get<ReservationDetail>(`/reservations/${id}`),
```

(keep the existing `create` method as-is)

- [ ] **Step 3: Write the failing tests for useCountdown**

`src/features/reservations/hooks/use-countdown.spec.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCountdown } from "./use-countdown";

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats the remaining time as mm:ss", () => {
    const { result } = renderHook(() => useCountdown("2026-01-01T00:02:05Z"));
    expect(result.current.formatted).toBe("2:05");
    expect(result.current.isExpired).toBe(false);
  });

  it("counts down as time passes", () => {
    const { result } = renderHook(() => useCountdown("2026-01-01T00:00:10Z"));
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.secondsLeft).toBe(7);
  });

  it("reports expired and clamps at zero once the target time has passed", () => {
    const { result } = renderHook(() => useCountdown("2026-01-01T00:00:05Z"));
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.isExpired).toBe(true);
    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.formatted).toBe("0:00");
  });
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `npm test -- --run src/features/reservations/hooks/use-countdown.spec.ts`
Expected: FAIL (module doesn't exist)

- [ ] **Step 5: Implement useCountdown**

`src/features/reservations/hooks/use-countdown.ts`:

```ts
"use client";

import { useEffect, useState } from "react";

function formatSeconds(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function secondsUntil(targetIso: string): number {
  return Math.round((new Date(targetIso).getTime() - Date.now()) / 1000);
}

export function useCountdown(targetIso: string) {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsUntil(targetIso));

  useEffect(() => {
    const interval = setInterval(() => setSecondsLeft(secondsUntil(targetIso)), 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  const clamped = Math.max(0, secondsLeft);
  return { secondsLeft: clamped, isExpired: secondsLeft <= 0, formatted: formatSeconds(clamped) };
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `npm test -- --run src/features/reservations/hooks/use-countdown.spec.ts`
Expected: PASS

- [ ] **Step 7: Write the failing test for CheckoutView's skeleton**

`src/features/reservations/components/checkout-view.spec.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@test/support/render-with-providers";

vi.mock("../api/reservations-api", () => ({
  reservationsApi: {
    get: vi.fn().mockResolvedValue({
      id: "res-1",
      status: "pending_payment",
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      createdAt: new Date().toISOString(),
      event: {
        id: "event-1",
        title: "Homem-Aranha: Um Novo Dia",
        posterUrl: null,
        date: "2026-09-01T22:00:00Z",
        location: "Cinema Verzel - Sala 3",
        price: "39.90",
      },
      seat: { id: "seat-1", label: "A1" },
    }),
  },
}));

import { CheckoutView } from "./checkout-view";

describe("CheckoutView", () => {
  it("shows the reserved event, seat and price once loaded", async () => {
    renderWithProviders(<CheckoutView reservationId="res-1" />);
    expect(await screen.findByText("Homem-Aranha: Um Novo Dia")).toBeInTheDocument();
    expect(screen.getByText(/Assento A1/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?39,90/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run to verify it fails**

Run: `npm test -- --run src/features/reservations/components/checkout-view.spec.tsx`
Expected: FAIL (module doesn't exist)

- [ ] **Step 9: Implement the CheckoutView skeleton**

`src/features/reservations/components/checkout-view.tsx`:

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { reservationsApi } from "../api/reservations-api";
import { useCountdown } from "../hooks/use-countdown";

function formatPrice(price: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(price),
  );
}

export function CheckoutView({ reservationId }: { reservationId: string }) {
  const { data: reservation, isLoading } = useQuery({
    queryKey: ["reservation", reservationId],
    queryFn: () => reservationsApi.get(reservationId),
  });

  const countdown = useCountdown(reservation?.expiresAt ?? new Date().toISOString());

  if (isLoading || !reservation) {
    return (
      <Box display="flex" justifyContent="center" p={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 480 }}>
      <Typography variant="h4" component="h1">
        {reservation.event.title}
      </Typography>
      <Typography color="text.secondary">
        {reservation.event.location} · Assento {reservation.seat.label}
      </Typography>
      <Typography variant="h6">{formatPrice(reservation.event.price)}</Typography>
      <Typography color={countdown.isExpired ? "error" : "text.secondary"}>
        {countdown.isExpired
          ? "Reserva expirada. Volte ao evento e escolha outro assento."
          : `Expira em ${countdown.formatted}`}
      </Typography>
    </Box>
  );
}
```

- [ ] **Step 10: Run to verify it passes**

Run: `npm test -- --run src/features/reservations/components/checkout-view.spec.tsx`
Expected: PASS

- [ ] **Step 11: Wire the checkout page**

`src/app/checkout/[reservationId]/page.tsx`:

```tsx
import { RoleGate } from "@/features/auth/components/role-gate";
import { CheckoutView } from "@/features/reservations/components/checkout-view";

export default async function CheckoutPage({
  params,
}: PageProps<"/checkout/[reservationId]">) {
  const { reservationId } = await params;

  return (
    <main className="flex-1 p-8">
      <RoleGate role="client">
        <CheckoutView reservationId={reservationId} />
      </RoleGate>
    </main>
  );
}
```

- [ ] **Step 12: Run the full suite and commit**

Run: `npm test`
Expected: all PASS

```bash
git add src/features/reservations src/app/checkout
git commit -m "feat: add checkout skeleton with reservation query and countdown"
```

---

### Task 11: Payment — SSE hook, card form, full checkout wiring

**Files:**
- Create: `src/features/payments/types.ts`
- Create: `src/features/payments/api/payments-api.ts`
- Create: `src/features/payments/hooks/use-payment-sse.ts`
- Test: `src/features/payments/hooks/use-payment-sse.spec.ts`
- Create: `src/features/payments/components/payment-form.tsx`
- Test: `src/features/payments/components/payment-form.spec.tsx`
- Modify: `src/features/reservations/components/checkout-view.tsx`
- Test: `src/features/reservations/components/checkout-view.spec.tsx` (extend)

**Interfaces:**
- Consumes: `ReservationDetail` (Task 10), `useToast`/`getErrorMessage` (Task 3).
- Produces: `PaymentSseEvent`, `PaymentEventPayment`, `PaymentEventTicket` from `@/features/payments/types`. `paymentsApi.requestPayment(reservationId: string, cardNumber: string): Promise<{ reservationId: string; status: string }>` from `@/features/payments/api/payments-api`. `usePaymentSse(reservationId: string): { status: "idle" | "listening" | "confirmed" | "declined" | "error" | "timeout"; event: PaymentSseEvent | null; start: () => void }` from `@/features/payments/hooks/use-payment-sse`. `PaymentForm({ onSubmit: (cardNumber: string) => void; disabled?: boolean })` from `@/features/payments/components/payment-form` — used by `CheckoutView`, and by `TicketDetail`/`TicketCard` in Task 12 for the resulting `PaymentEventTicket` shape.

- [ ] **Step 1: Write the payment types**

`src/features/payments/types.ts`:

```ts
export interface PaymentEventPayment {
  id: string;
  reservationId: string;
  status: string;
  amount: string;
  createdAt: string;
}

export interface PaymentEventTicket {
  id: string;
  qrToken: string;
  shareToken: string;
  status: string;
  createdAt: string;
}

export type PaymentSseEvent =
  | { type: "confirmed"; payment: PaymentEventPayment; ticket: PaymentEventTicket }
  | { type: "declined"; payment: PaymentEventPayment }
  | { type: "error"; message: string };
```

- [ ] **Step 2: Write the payments API**

`src/features/payments/api/payments-api.ts`:

```ts
import { apiClient } from "@/shared/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const paymentsApi = {
  requestPayment: (reservationId: string, cardNumber: string) =>
    apiClient.post<{ reservationId: string; status: string }>(
      `/reservations/${reservationId}/payment`,
      { cardNumber },
    ),
  eventsUrl: (reservationId: string) => `${API_URL}/reservations/${reservationId}/payment/events`,
};
```

- [ ] **Step 3: Write the failing tests for usePaymentSse**

`src/features/payments/hooks/use-payment-sse.spec.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePaymentSse } from "./use-payment-sse";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  url: string;
  options?: { withCredentials?: boolean };
  close = vi.fn();

  constructor(url: string, options?: { withCredentials?: boolean }) {
    this.url = url;
    this.options = options;
    FakeEventSource.instances.push(this);
  }

  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }
}

describe("usePaymentSse", () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("opens the SSE connection with credentials on start", () => {
    const { result } = renderHook(() => usePaymentSse("res-1"));
    act(() => result.current.start());

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0].url).toContain("/reservations/res-1/payment/events");
    expect(FakeEventSource.instances[0].options?.withCredentials).toBe(true);
    expect(result.current.status).toBe("listening");
  });

  it("moves to confirmed and closes the connection on a confirmed message", () => {
    const { result } = renderHook(() => usePaymentSse("res-1"));
    act(() => result.current.start());

    const payload = {
      type: "confirmed" as const,
      payment: {
        id: "p1",
        reservationId: "res-1",
        status: "approved",
        amount: "39.90",
        createdAt: "now",
      },
      ticket: { id: "t1", qrToken: "abc", shareToken: "xyz", status: "valid", createdAt: "now" },
    };
    act(() => FakeEventSource.instances[0].emit(payload));

    expect(result.current.status).toBe("confirmed");
    expect(result.current.event).toEqual(payload);
    expect(FakeEventSource.instances[0].close).toHaveBeenCalled();
  });

  it("moves to declined on a declined message", () => {
    const { result } = renderHook(() => usePaymentSse("res-1"));
    act(() => result.current.start());

    const payload = {
      type: "declined" as const,
      payment: {
        id: "p1",
        reservationId: "res-1",
        status: "declined",
        amount: "39.90",
        createdAt: "now",
      },
    };
    act(() => FakeEventSource.instances[0].emit(payload));

    expect(result.current.status).toBe("declined");
  });

  it("moves to timeout and closes the connection if no message arrives in time", () => {
    const { result } = renderHook(() => usePaymentSse("res-1"));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(30_000));

    expect(result.current.status).toBe("timeout");
    expect(FakeEventSource.instances[0].close).toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `npm test -- --run src/features/payments/hooks/use-payment-sse.spec.ts`
Expected: FAIL (module doesn't exist)

- [ ] **Step 5: Implement usePaymentSse**

`src/features/payments/hooks/use-payment-sse.ts`:

```ts
"use client";

import { useCallback, useRef, useState } from "react";
import { paymentsApi } from "../api/payments-api";
import { PaymentSseEvent } from "../types";

const TIMEOUT_MS = 30_000;

export type PaymentSseStatus =
  | "idle"
  | "listening"
  | "confirmed"
  | "declined"
  | "error"
  | "timeout";

export function usePaymentSse(reservationId: string) {
  const [status, setStatus] = useState<PaymentSseStatus>("idle");
  const [event, setEvent] = useState<PaymentSseEvent | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const start = useCallback(() => {
    setStatus("listening");
    setEvent(null);
    const source = new EventSource(paymentsApi.eventsUrl(reservationId), { withCredentials: true });
    sourceRef.current = source;

    timeoutRef.current = setTimeout(() => {
      setStatus("timeout");
      stop();
    }, TIMEOUT_MS);

    source.onmessage = (message) => {
      const payload = JSON.parse(message.data) as PaymentSseEvent;
      setEvent(payload);
      setStatus(payload.type);
      stop();
    };

    source.onerror = () => {
      setStatus("error");
      stop();
    };
  }, [reservationId, stop]);

  return { status, event, start, stop };
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `npm test -- --run src/features/payments/hooks/use-payment-sse.spec.ts`
Expected: PASS

- [ ] **Step 7: Write the failing test for PaymentForm**

`src/features/payments/components/payment-form.spec.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@test/support/render-with-providers";
import { PaymentForm } from "./payment-form";

describe("PaymentForm", () => {
  it("shows a validation error for a card number that's too short", async () => {
    renderWithProviders(<PaymentForm onSubmit={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Número do cartão"), "123");
    await userEvent.click(screen.getByRole("button", { name: "Pagar" }));
    expect(await screen.findByText("Informe um número de cartão válido")).toBeInTheDocument();
  });

  it("calls onSubmit with the digits-only card number", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<PaymentForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Número do cartão"), "4000 0000 0000 0002");
    await userEvent.click(screen.getByRole("button", { name: "Pagar" }));
    expect(onSubmit).toHaveBeenCalledWith("4000000000000002");
  });

  it("disables the submit button while disabled prop is true", () => {
    renderWithProviders(<PaymentForm onSubmit={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: "Pagar" })).toBeDisabled();
  });
});
```

- [ ] **Step 8: Run to verify it fails**

Run: `npm test -- --run src/features/payments/components/payment-form.spec.tsx`
Expected: FAIL (module doesn't exist)

- [ ] **Step 9: Implement PaymentForm**

`src/features/payments/components/payment-form.tsx`:

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

const schema = z.object({
  cardNumber: z
    .string()
    .transform((value) => value.replace(/\s+/g, ""))
    .refine((value) => /^\d{13,19}$/.test(value), "Informe um número de cartão válido"),
});

type FormValues = z.infer<typeof schema>;

export function PaymentForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (cardNumber: string) => void;
  disabled?: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <Box
      component="form"
      onSubmit={handleSubmit((values) => onSubmit(values.cardNumber))}
      sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 360 }}
    >
      <TextField
        label="Número do cartão"
        error={!!errors.cardNumber}
        helperText={errors.cardNumber?.message}
        {...register("cardNumber")}
      />
      <Button type="submit" variant="contained" disabled={disabled}>
        Pagar
      </Button>
    </Box>
  );
}
```

- [ ] **Step 10: Run to verify it passes**

Run: `npm test -- --run src/features/payments/components/payment-form.spec.tsx`
Expected: PASS

- [ ] **Step 11: Extend the CheckoutView test for the full payment flow**

Append to `src/features/reservations/components/checkout-view.spec.tsx` (add the necessary mocks at the top, alongside the existing `reservations-api` mock):

```tsx
import { useRouter } from "next/navigation";

vi.mock("next/navigation", () => ({ useRouter: vi.fn() }));

vi.mock("@/features/payments/api/payments-api", () => ({
  paymentsApi: {
    requestPayment: vi.fn().mockResolvedValue({ reservationId: "res-1", status: "processing" }),
    eventsUrl: (id: string) => `http://localhost:3000/api/reservations/${id}/payment/events`,
  },
}));

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  close = vi.fn();
  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }
  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }
}
```

And add these two tests inside the existing `describe("CheckoutView", ...)` block:

```tsx
  it("submits the card, listens for the SSE confirmation, and redirects to the ticket", async () => {
    const pushMock = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: pushMock } as unknown as ReturnType<typeof useRouter>);
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);

    renderWithProviders(<CheckoutView reservationId="res-1" />);
    await screen.findByText("Homem-Aranha: Um Novo Dia");

    await userEvent.type(screen.getByLabelText("Número do cartão"), "4111111111111111");
    await userEvent.click(screen.getByRole("button", { name: "Pagar" }));

    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    FakeEventSource.instances[0].emit({
      type: "confirmed",
      payment: { id: "p1", reservationId: "res-1", status: "approved", amount: "39.90", createdAt: "now" },
      ticket: { id: "t1", qrToken: "abc", shareToken: "xyz", status: "valid", createdAt: "now" },
    });

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/meus-ingressos"));
    vi.unstubAllGlobals();
  });

  it("shows a declined message and lets the client try again", async () => {
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);

    renderWithProviders(<CheckoutView reservationId="res-1" />);
    await screen.findByText("Homem-Aranha: Um Novo Dia");

    await userEvent.type(screen.getByLabelText("Número do cartão"), "4000000000000002");
    await userEvent.click(screen.getByRole("button", { name: "Pagar" }));

    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    FakeEventSource.instances[0].emit({
      type: "declined",
      payment: { id: "p1", reservationId: "res-1", status: "declined", amount: "39.90", createdAt: "now" },
    });

    expect(await screen.findByText("Pagamento recusado. Tente outro cartão.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pagar" })).not.toBeDisabled();
    vi.unstubAllGlobals();
  });
```

Add `import { waitFor } from "@testing-library/react";` and `import userEvent from "@testing-library/user-event";` to the top of the spec file alongside the existing imports.

- [ ] **Step 12: Run to verify the new tests fail**

Run: `npm test -- --run src/features/reservations/components/checkout-view.spec.tsx`
Expected: FAIL (no payment form wired in yet)

- [ ] **Step 13: Wire payment into CheckoutView**

Replace `src/features/reservations/components/checkout-view.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { reservationsApi } from "../api/reservations-api";
import { useCountdown } from "../hooks/use-countdown";
import { paymentsApi } from "@/features/payments/api/payments-api";
import { usePaymentSse } from "@/features/payments/hooks/use-payment-sse";
import { PaymentForm } from "@/features/payments/components/payment-form";

function formatPrice(price: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(price),
  );
}

export function CheckoutView({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const { data: reservation, isLoading } = useQuery({
    queryKey: ["reservation", reservationId],
    queryFn: () => reservationsApi.get(reservationId),
  });

  const countdown = useCountdown(reservation?.expiresAt ?? new Date().toISOString());
  const sse = usePaymentSse(reservationId);

  const payMutation = useMutation({
    mutationFn: (cardNumber: string) => paymentsApi.requestPayment(reservationId, cardNumber),
    onSuccess: () => sse.start(),
  });

  useEffect(() => {
    if (sse.status === "confirmed") {
      router.push("/meus-ingressos");
    }
  }, [sse.status, router]);

  if (isLoading || !reservation) {
    return (
      <Box display="flex" justifyContent="center" p={8}>
        <CircularProgress />
      </Box>
    );
  }

  const isProcessing = payMutation.isPending || sse.status === "listening";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 480 }}>
      <Typography variant="h4" component="h1">
        {reservation.event.title}
      </Typography>
      <Typography color="text.secondary">
        {reservation.event.location} · Assento {reservation.seat.label}
      </Typography>
      <Typography variant="h6">{formatPrice(reservation.event.price)}</Typography>
      <Typography color={countdown.isExpired ? "error" : "text.secondary"}>
        {countdown.isExpired
          ? "Reserva expirada. Volte ao evento e escolha outro assento."
          : `Expira em ${countdown.formatted}`}
      </Typography>

      <PaymentForm onSubmit={(cardNumber) => payMutation.mutate(cardNumber)} disabled={isProcessing} />

      {sse.status === "listening" ? <Typography>Processando pagamento…</Typography> : null}
      {sse.status === "declined" ? (
        <Typography color="error">Pagamento recusado. Tente outro cartão.</Typography>
      ) : null}
      {sse.status === "error" || sse.status === "timeout" ? (
        <Typography color="error">
          Não conseguimos confirmar o pagamento agora. Tente novamente.
        </Typography>
      ) : null}
    </Box>
  );
}
```

- [ ] **Step 14: Run to verify it passes**

Run: `npm test -- --run src/features/reservations/components/checkout-view.spec.tsx`
Expected: PASS

- [ ] **Step 15: Run the full suite and commit**

Run: `npm test`
Expected: all PASS

```bash
git add src/features/payments src/features/reservations
git commit -m "feat: wire simulated payment with SSE status updates into checkout"
```

---

### Task 12: Tickets — types, api, TicketCard, meus-ingressos page

**Files:**
- Create: `src/features/tickets/types.ts`
- Create: `src/features/tickets/api/tickets-api.ts`
- Create: `src/features/tickets/components/ticket-card.tsx`
- Test: `src/features/tickets/components/ticket-card.spec.tsx`
- Modify: `src/app/meus-ingressos/page.tsx`
- Test: `src/app/meus-ingressos/page.spec.tsx`

**Interfaces:**
- Consumes: `Paginated<T>` (Task 3), `RoleGate` (Task 4).
- Produces: `TicketStatus`, `TicketDetail` from `@/features/tickets/types` — also used by Task 13's shared ticket page. `ticketsApi.listMine(page?: number): Promise<Paginated<TicketDetail>>`, `ticketsApi.get(id: string): Promise<TicketDetail>`, `ticketsApi.getShared(shareToken: string): Promise<TicketDetail>` from `@/features/tickets/api/tickets-api`. `TicketCard({ ticket: TicketDetail })` from `@/features/tickets/components/ticket-card` — reused as-is by Task 13.

- [ ] **Step 1: Write the ticket types**

`src/features/tickets/types.ts`:

```ts
export type TicketStatus = "valid" | "used";

export interface TicketDetail {
  ticket: {
    id: string;
    qrToken: string;
    shareToken: string;
    status: TicketStatus;
    createdAt: string;
  };
  event: {
    id: string;
    title: string;
    date: string;
    location: string;
  };
  seat: {
    id: string;
    label: string;
  };
}
```

- [ ] **Step 2: Write the tickets API**

`src/features/tickets/api/tickets-api.ts`:

```ts
import { apiClient } from "@/shared/api-client";
import { Paginated } from "@/shared/api-client/pagination";
import { TicketDetail } from "../types";

export const ticketsApi = {
  listMine: (page = 1) => apiClient.get<Paginated<TicketDetail>>(`/tickets/mine?page=${page}`),
  get: (id: string) => apiClient.get<TicketDetail>(`/tickets/${id}`),
  getShared: (shareToken: string) => apiClient.get<TicketDetail>(`/tickets/shared/${shareToken}`),
};
```

- [ ] **Step 3: Write the failing test for TicketCard**

`src/features/tickets/components/ticket-card.spec.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TicketCard } from "./ticket-card";
import { TicketDetail } from "../types";

const ticket: TicketDetail = {
  ticket: { id: "t1", qrToken: "abc123", shareToken: "share-xyz", status: "valid", createdAt: "2026-08-01T00:00:00Z" },
  event: { id: "event-1", title: "Homem-Aranha: Um Novo Dia", date: "2026-09-01T22:00:00Z", location: "Cinema Verzel - Sala 3" },
  seat: { id: "seat-1", label: "A1" },
};

describe("TicketCard", () => {
  it("renders the event, seat and a QR code for the ticket", () => {
    render(<TicketCard ticket={ticket} />);
    expect(screen.getByText("Homem-Aranha: Um Novo Dia")).toBeInTheDocument();
    expect(screen.getByText(/Assento A1/)).toBeInTheDocument();
    expect(document.querySelector("svg")).toBeInTheDocument();
  });

  it("shows a used badge when the ticket has already been validated", () => {
    render(<TicketCard ticket={{ ...ticket, ticket: { ...ticket.ticket, status: "used" } }} />);
    expect(screen.getByText("Utilizado")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `npm test -- --run src/features/tickets/components/ticket-card.spec.tsx`
Expected: FAIL (module doesn't exist)

- [ ] **Step 5: Implement TicketCard**

`src/features/tickets/components/ticket-card.tsx`:

```tsx
import { QRCodeSVG } from "qrcode.react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { TicketDetail } from "../types";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(iso),
  );
}

export function TicketCard({ ticket }: { ticket: TicketDetail }) {
  return (
    <Card sx={{ maxWidth: 360, p: 2 }}>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "center" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
          <Typography variant="h6" component="h3">
            {ticket.event.title}
          </Typography>
          <Chip
            label={ticket.ticket.status === "used" ? "Utilizado" : "Válido"}
            color={ticket.ticket.status === "used" ? "default" : "success"}
            size="small"
          />
        </Box>
        <Typography color="text.secondary">
          {formatDate(ticket.event.date)} · {ticket.event.location}
        </Typography>
        <Typography>Assento {ticket.seat.label}</Typography>
        <QRCodeSVG value={ticket.ticket.qrToken} size={200} />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `npm test -- --run src/features/tickets/components/ticket-card.spec.tsx`
Expected: PASS

- [ ] **Step 7: Write the failing test for the meus-ingressos page**

`src/app/meus-ingressos/page.spec.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@test/support/render-with-providers";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

vi.mock("@/features/auth/api/use-current-user", () => ({
  useCurrentUser: () => ({
    data: { id: "client-1", name: "Ana", email: "ana@verzel.com", role: "client" },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/features/tickets/api/tickets-api", () => ({
  ticketsApi: {
    listMine: vi.fn().mockResolvedValue({
      data: [
        {
          ticket: { id: "t1", qrToken: "abc", shareToken: "xyz", status: "valid", createdAt: "2026-08-01T00:00:00Z" },
          event: { id: "event-1", title: "Homem-Aranha: Um Novo Dia", date: "2026-09-01T22:00:00Z", location: "Cinema Verzel - Sala 3" },
          seat: { id: "seat-1", label: "A1" },
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
  },
}));

import MyTicketsPage from "./page";

describe("MyTicketsPage", () => {
  it("renders the client's tickets", async () => {
    renderWithProviders(<MyTicketsPage />);
    expect(await screen.findByText("Homem-Aranha: Um Novo Dia")).toBeInTheDocument();
  });

  it("shows an empty state when there are no tickets yet", async () => {
    const { ticketsApi } = await import("@/features/tickets/api/tickets-api");
    vi.mocked(ticketsApi.listMine).mockResolvedValueOnce({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    renderWithProviders(<MyTicketsPage />);
    expect(await screen.findByText("Você ainda não tem ingressos.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run to verify it fails**

Run: `npm test -- --run src/app/meus-ingressos/page.spec.tsx`
Expected: FAIL (page still renders the old stub markup)

- [ ] **Step 9: Implement the meus-ingressos page**

`src/app/meus-ingressos/page.tsx`:

```tsx
"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { useQuery } from "@tanstack/react-query";
import { RoleGate } from "@/features/auth/components/role-gate";
import { ticketsApi } from "@/features/tickets/api/tickets-api";
import { TicketCard } from "@/features/tickets/components/ticket-card";

function MyTicketsList() {
  const { data, isLoading } = useQuery({
    queryKey: ["tickets", "mine"],
    queryFn: () => ticketsApi.listMine(),
  });

  if (isLoading || !data) {
    return (
      <Box display="flex" justifyContent="center" p={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (data.data.length === 0) {
    return <Typography>Você ainda não tem ingressos.</Typography>;
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
      {data.data.map((ticket) => (
        <TicketCard key={ticket.ticket.id} ticket={ticket} />
      ))}
    </Box>
  );
}

export default function MyTicketsPage() {
  return (
    <main className="flex-1 p-8">
      <RoleGate role="client">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Typography variant="h4" component="h1">
            Meus ingressos
          </Typography>
          <MyTicketsList />
        </Box>
      </RoleGate>
    </main>
  );
}
```

- [ ] **Step 10: Run to verify it passes**

Run: `npm test -- --run src/app/meus-ingressos/page.spec.tsx`
Expected: PASS

- [ ] **Step 11: Run the full suite and commit**

Run: `npm test`
Expected: all PASS

```bash
git add src/features/tickets src/app/meus-ingressos
git commit -m "feat: implement meus ingressos page with ticket QR display"
```

---

### Task 13: Shared ticket page

**Files:**
- Modify: `src/app/ingressos/[shareToken]/page.tsx`
- Test: `src/app/ingressos/[shareToken]/page.spec.tsx`

**Interfaces:**
- Consumes: `ticketsApi.getShared` (Task 12), `TicketCard` (Task 12).

This page is public (no `RoleGate`) — the link itself is what authorizes access, matching the backend's `GET /tickets/shared/:shareToken` being unauthenticated. It's a Server Component, like the public events pages.

- [ ] **Step 1: Write the failing test**

`src/app/ingressos/[shareToken]/page.spec.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/features/tickets/api/tickets-api", () => ({
  ticketsApi: {
    getShared: vi.fn().mockResolvedValue({
      ticket: { id: "t1", qrToken: "abc", shareToken: "xyz", status: "valid", createdAt: "2026-08-01T00:00:00Z" },
      event: { id: "event-1", title: "Homem-Aranha: Um Novo Dia", date: "2026-09-01T22:00:00Z", location: "Cinema Verzel - Sala 3" },
      seat: { id: "seat-1", label: "A1" },
    }),
  },
}));

import SharedTicketPage from "./page";

describe("SharedTicketPage", () => {
  it("renders the shared ticket without requiring authentication", async () => {
    render(await SharedTicketPage({ params: Promise.resolve({ shareToken: "xyz" }) }));
    expect(screen.getByText("Homem-Aranha: Um Novo Dia")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --run "src/app/ingressos/[shareToken]/page.spec.tsx"`
Expected: FAIL (page still renders the old stub markup)

- [ ] **Step 3: Implement the shared ticket page**

`src/app/ingressos/[shareToken]/page.tsx`:

```tsx
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ticketsApi } from "@/features/tickets/api/tickets-api";
import { TicketCard } from "@/features/tickets/components/ticket-card";

export default async function SharedTicketPage({
  params,
}: PageProps<"/ingressos/[shareToken]">) {
  const { shareToken } = await params;
  const ticket = await ticketsApi.getShared(shareToken);

  return (
    <Box component="main" sx={{ flex: 1, p: 4, display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h4" component="h1">
        Ingresso compartilhado
      </Typography>
      <TicketCard ticket={ticket} />
    </Box>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- --run "src/app/ingressos/[shareToken]/page.spec.tsx"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "src/app/ingressos"
git commit -m "feat: implement shared ticket page"
```

---

### Task 14: Organizer — TMDb catalog api and movie picker

**Files:**
- Create: `src/features/catalog/types.ts`
- Create: `src/features/catalog/api/catalog-api.ts`
- Create: `src/features/catalog/components/movie-picker.tsx`
- Test: `src/features/catalog/components/movie-picker.spec.tsx`

**Interfaces:**
- Consumes: `Paginated<T>` (Task 3).
- Produces: `CatalogMovie` from `@/features/catalog/types`. `catalogApi.listNowPlaying(page?: number): Promise<Paginated<CatalogMovie>>` from `@/features/catalog/api/catalog-api`. `MoviePicker({ value: CatalogMovie | null; onChange: (movie: CatalogMovie | null) => void })` from `@/features/catalog/components/movie-picker` — used by Task 15's create-event form.

Note: `GET /catalog/movies` only accepts `page` (no `limit` — TMDb controls page size server-side, per the spec's API contract). It's organizer-only, so the picker is only ever rendered behind a `RoleGate role="organizer"`.

- [ ] **Step 1: Write the catalog type**

`src/features/catalog/types.ts`:

```ts
export interface CatalogMovie {
  tmdbId: string;
  title: string;
  synopsis: string | null;
  posterUrl: string | null;
  releaseDate: string | null;
}
```

- [ ] **Step 2: Write the catalog API**

`src/features/catalog/api/catalog-api.ts`:

```ts
import { apiClient } from "@/shared/api-client";
import { Paginated } from "@/shared/api-client/pagination";
import { CatalogMovie } from "../types";

export const catalogApi = {
  listNowPlaying: (page = 1) => apiClient.get<Paginated<CatalogMovie>>(`/catalog/movies?page=${page}`),
};
```

- [ ] **Step 3: Write the failing test for MoviePicker**

`src/features/catalog/components/movie-picker.spec.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@test/support/render-with-providers";

vi.mock("../api/catalog-api", () => ({
  catalogApi: {
    listNowPlaying: vi.fn().mockResolvedValue({
      data: [
        { tmdbId: "969681", title: "Homem-Aranha: Um Novo Dia", synopsis: null, posterUrl: null, releaseDate: "2026-07-01" },
        { tmdbId: "1234", title: "Outro Filme", synopsis: null, posterUrl: null, releaseDate: "2026-07-15" },
      ],
      meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
    }),
  },
}));

import { MoviePicker } from "./movie-picker";

describe("MoviePicker", () => {
  it("lets the organizer search and select a movie from the catalog", async () => {
    const onChange = vi.fn();
    renderWithProviders(<MoviePicker value={null} onChange={onChange} />);

    const input = await screen.findByLabelText("Filme");
    await userEvent.type(input, "Homem");
    await waitFor(() => expect(screen.getByText("Homem-Aranha: Um Novo Dia")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Homem-Aranha: Um Novo Dia"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ tmdbId: "969681", title: "Homem-Aranha: Um Novo Dia" }),
    );
  });
});
```

- [ ] **Step 4: Run to verify it fails**

Run: `npm test -- --run src/features/catalog/components/movie-picker.spec.tsx`
Expected: FAIL (module doesn't exist)

- [ ] **Step 5: Implement MoviePicker**

`src/features/catalog/components/movie-picker.tsx`:

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { catalogApi } from "../api/catalog-api";
import { CatalogMovie } from "../types";

export function MoviePicker({
  value,
  onChange,
}: {
  value: CatalogMovie | null;
  onChange: (movie: CatalogMovie | null) => void;
}) {
  const { data } = useQuery({
    queryKey: ["catalog", "now-playing"],
    queryFn: () => catalogApi.listNowPlaying(),
  });

  return (
    <Autocomplete
      options={data?.data ?? []}
      getOptionLabel={(movie) => movie.title}
      isOptionEqualToValue={(option, val) => option.tmdbId === val.tmdbId}
      value={value}
      onChange={(_, movie) => onChange(movie)}
      renderInput={(params) => <TextField {...params} label="Filme" />}
    />
  );
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `npm test -- --run src/features/catalog/components/movie-picker.spec.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/catalog
git commit -m "feat: add TMDb catalog api and movie picker"
```

---

### Task 15: Organizer — create-event form and events list page

**Files:**
- Create: `src/features/events/components/create-event-form.tsx`
- Test: `src/features/events/components/create-event-form.spec.tsx`
- Modify: `src/app/organizador/eventos/novo/page.tsx`
- Create: `src/features/events/components/organizer-events-list.tsx`
- Test: `src/features/events/components/organizer-events-list.spec.tsx`
- Modify: `src/app/organizador/eventos/page.tsx`

**Interfaces:**
- Consumes: `eventsApi.create`/`listMine` (Task 7), `MoviePicker` (Task 14), `RoleGate` (Task 4), `useToast`/`getErrorMessage` (Task 3).

- [ ] **Step 1: Write the failing test for CreateEventForm**

`src/features/events/components/create-event-form.spec.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@test/support/render-with-providers";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

vi.mock("@/features/catalog/api/catalog-api", () => ({
  catalogApi: {
    listNowPlaying: vi.fn().mockResolvedValue({
      data: [{ tmdbId: "969681", title: "Homem-Aranha: Um Novo Dia", synopsis: null, posterUrl: null, releaseDate: "2026-07-01" }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
  },
}));

const createEventMock = vi.fn();
vi.mock("../api/events-api", () => ({
  eventsApi: { create: (...args: unknown[]) => createEventMock(...args) },
}));

import { CreateEventForm } from "./create-event-form";

describe("CreateEventForm", () => {
  beforeEach(() => {
    pushMock.mockClear();
    createEventMock.mockReset();
  });

  it("shows a validation error when capacity exceeds the seat-grid limit", async () => {
    renderWithProviders(<CreateEventForm />);
    await userEvent.type(screen.getByLabelText("Capacidade"), "300");
    await userEvent.click(screen.getByRole("button", { name: "Publicar evento" }));
    expect(await screen.findByText("A capacidade máxima é 260 lugares")).toBeInTheDocument();
  });

  it("submits the form and redirects to the organizer events list", async () => {
    createEventMock.mockResolvedValue({
      id: "event-1",
      organizerId: "org-1",
      title: "Homem-Aranha: Um Novo Dia",
      synopsis: null,
      posterUrl: null,
      tmdbId: "969681",
      date: "2026-09-01T22:00:00.000Z",
      location: "Cinema Verzel - Sala 3",
      capacity: 24,
      price: "39.90",
      createdAt: "2026-08-01T00:00:00Z",
    });
    renderWithProviders(<CreateEventForm />);

    const movieInput = await screen.findByLabelText("Filme");
    await userEvent.type(movieInput, "Homem");
    await waitFor(() => expect(screen.getByText("Homem-Aranha: Um Novo Dia")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Homem-Aranha: Um Novo Dia"));

    await userEvent.type(screen.getByLabelText("Data e hora"), "2026-09-01T22:00");
    await userEvent.type(screen.getByLabelText("Local"), "Cinema Verzel - Sala 3");
    await userEvent.type(screen.getByLabelText("Capacidade"), "24");
    await userEvent.type(screen.getByLabelText("Preço"), "39.90");
    await userEvent.click(screen.getByRole("button", { name: "Publicar evento" }));

    await waitFor(() =>
      expect(createEventMock).toHaveBeenCalledWith({
        tmdbId: "969681",
        date: "2026-09-01T22:00:00.000Z",
        location: "Cinema Verzel - Sala 3",
        capacity: 24,
        price: "39.90",
      }),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/organizador/eventos"));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --run src/features/events/components/create-event-form.spec.tsx`
Expected: FAIL (module doesn't exist)

- [ ] **Step 3: Implement CreateEventForm**

`src/features/events/components/create-event-form.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { eventsApi } from "../api/events-api";
import { MoviePicker } from "@/features/catalog/components/movie-picker";
import { CatalogMovie } from "@/features/catalog/types";
import { useToast } from "@/shared/ui/toast-provider";
import { getErrorMessage } from "@/shared/api-client/error-messages";

const schema = z.object({
  movie: z
    .custom<CatalogMovie | null>()
    .refine((value): value is CatalogMovie => value !== null, "Escolha um filme do catálogo"),
  date: z
    .string()
    .min(1, "Informe a data e hora")
    .transform((value) => new Date(value).toISOString()),
  location: z.string().min(2, "Informe o local"),
  capacity: z.coerce
    .number({ error: "Informe a capacidade" })
    .int()
    .positive("A capacidade precisa ser maior que zero")
    .max(260, "A capacidade máxima é 260 lugares"),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Informe um preço válido, ex: 39.90"),
});

// z.input (pre-parse shape, matches useForm's defaultValues/register) differs from
// z.output (post-transform/coerce shape, what onValid receives) — see the `capacity`
// and `date` fields above. Passing both generics to useForm is required for this to
// type-check; a single shared type here causes a Resolver assignability error.
type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export function CreateEventForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { movie: null, date: "", location: "", capacity: "", price: "" },
  });

  const mutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => router.push("/organizador/eventos"),
    onError: (error) => showToast(getErrorMessage(error)),
  });

  const onValid = (values: FormOutput) =>
    mutation.mutate({
      tmdbId: values.movie.tmdbId,
      date: values.date,
      location: values.location,
      capacity: values.capacity,
      price: values.price,
    });

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onValid)}
      sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 420 }}
    >
      <Controller
        name="movie"
        control={control}
        render={({ field }) => <MoviePicker value={field.value} onChange={field.onChange} />}
      />
      {errors.movie ? <span>{errors.movie.message as string}</span> : null}

      <TextField
        label="Data e hora"
        type="datetime-local"
        slotProps={{ inputLabel: { shrink: true } }}
        error={!!errors.date}
        helperText={errors.date?.message}
        {...register("date")}
      />
      <TextField
        label="Local"
        error={!!errors.location}
        helperText={errors.location?.message}
        {...register("location")}
      />
      <TextField
        label="Capacidade"
        type="number"
        error={!!errors.capacity}
        helperText={errors.capacity?.message}
        {...register("capacity")}
      />
      <TextField
        label="Preço"
        placeholder="39.90"
        error={!!errors.price}
        helperText={errors.price?.message}
        {...register("price")}
      />
      <Button type="submit" variant="contained" disabled={mutation.isPending}>
        Publicar evento
      </Button>
    </Box>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- --run src/features/events/components/create-event-form.spec.tsx`
Expected: PASS

- [ ] **Step 5: Wire the new-event page**

`src/app/organizador/eventos/novo/page.tsx`:

```tsx
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { RoleGate } from "@/features/auth/components/role-gate";
import { CreateEventForm } from "@/features/events/components/create-event-form";

export default function NewEventPage() {
  return (
    <main className="flex-1 p-8">
      <RoleGate role="organizer">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Typography variant="h4" component="h1">
            Novo evento
          </Typography>
          <CreateEventForm />
        </Box>
      </RoleGate>
    </main>
  );
}
```

- [ ] **Step 6: Write the failing test for OrganizerEventsList**

`src/features/events/components/organizer-events-list.spec.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@test/support/render-with-providers";

vi.mock("../api/events-api", () => ({
  eventsApi: {
    listMine: vi.fn().mockResolvedValue({
      data: [
        {
          id: "1", organizerId: "org-1", title: "Homem-Aranha: Um Novo Dia", synopsis: null,
          posterUrl: null, tmdbId: "969681", date: "2026-09-01T22:00:00Z",
          location: "Cinema Verzel - Sala 3", capacity: 24, price: "39.90", createdAt: "2026-08-01T00:00:00Z",
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
  },
}));

import { OrganizerEventsList } from "./organizer-events-list";

describe("OrganizerEventsList", () => {
  it("renders the organizer's own events", async () => {
    renderWithProviders(<OrganizerEventsList />);
    expect(await screen.findByText("Homem-Aranha: Um Novo Dia")).toBeInTheDocument();
  });

  it("shows an empty state with a call to action when there are no events yet", async () => {
    const { eventsApi } = await import("../api/events-api");
    vi.mocked(eventsApi.listMine).mockResolvedValueOnce({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    renderWithProviders(<OrganizerEventsList />);
    expect(await screen.findByText("Você ainda não publicou nenhum evento.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run to verify it fails**

Run: `npm test -- --run src/features/events/components/organizer-events-list.spec.tsx`
Expected: FAIL (module doesn't exist)

- [ ] **Step 8: Implement OrganizerEventsList**

`src/features/events/components/organizer-events-list.tsx`:

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { eventsApi } from "../api/events-api";
import { EventCard } from "./event-card";

export function OrganizerEventsList() {
  const { data, isLoading } = useQuery({
    queryKey: ["events", "mine"],
    queryFn: () => eventsApi.listMine(),
  });

  if (isLoading || !data) {
    return (
      <Box display="flex" justifyContent="center" p={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (data.data.length === 0) {
    return <Typography>Você ainda não publicou nenhum evento.</Typography>;
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
      {data.data.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </Box>
  );
}
```

- [ ] **Step 9: Run to verify it passes**

Run: `npm test -- --run src/features/events/components/organizer-events-list.spec.tsx`
Expected: PASS

- [ ] **Step 10: Wire the organizer events list page**

`src/app/organizador/eventos/page.tsx`:

```tsx
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "next/link";
import { RoleGate } from "@/features/auth/components/role-gate";
import { OrganizerEventsList } from "@/features/events/components/organizer-events-list";

export default function OrganizerEventsPage() {
  return (
    <main className="flex-1 p-8">
      <RoleGate role="organizer">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h4" component="h1">
              Meus eventos
            </Typography>
            <Button component={Link} href="/organizador/eventos/novo" variant="contained">
              Novo evento
            </Button>
          </Box>
          <OrganizerEventsList />
        </Box>
      </RoleGate>
    </main>
  );
}
```

- [ ] **Step 11: Run the full suite and commit**

Run: `npm test`
Expected: all PASS

```bash
git add src/features/events "src/app/organizador"
git commit -m "feat: implement organizer create-event form and events list"
```

---

### Task 16: Gatekeeper outcome-mapping logic

**Files:**
- Create: `src/features/gatekeeper/types.ts`
- Create: `src/features/gatekeeper/lib/map-validation-outcome.ts`
- Test: `src/features/gatekeeper/lib/map-validation-outcome.spec.ts`

**Interfaces:**
- Consumes: `ApiError` (Task 2).
- Produces: `ValidateTicketResult`, `GatekeeperOutcome` from `@/features/gatekeeper/types`. `mapValidationOutcome(selectedEventId: string, result: ValidateTicketResult | null, error: ApiError | null): GatekeeperOutcome` from `@/features/gatekeeper/lib/map-validation-outcome` — used by Task 17's `GatekeeperView`.

This is the pure function implementing the spec's "evento errado" client-side workaround (`docs/superpowers/specs/2026-08-20-frontend-eventos-ingressos-design.md`, section "Portaria"): the backend's `POST /gatekeeper/validate` has no per-event scoping, so wrong-event detection happens here by comparing the returned ticket's event against the one the gatekeeper selected.

- [ ] **Step 1: Write the gatekeeper types**

`src/features/gatekeeper/types.ts`:

```ts
export interface ValidateTicketResult {
  ticket: { id: string; status: "valid" | "used"; usedAt: string | null };
  event: { id: string; title: string };
  seat: { id: string; label: string };
}

export type GatekeeperOutcome =
  | { kind: "valid"; result: ValidateTicketResult }
  | { kind: "wrong_event"; result: ValidateTicketResult }
  | { kind: "already_used" }
  | { kind: "invalid" };
```

- [ ] **Step 2: Write the failing tests**

`src/features/gatekeeper/lib/map-validation-outcome.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api-client";
import { mapValidationOutcome } from "./map-validation-outcome";
import { ValidateTicketResult } from "../types";

const baseResult: ValidateTicketResult = {
  ticket: { id: "t1", status: "used", usedAt: "2026-01-01T00:00:00Z" },
  event: { id: "event-1", title: "Homem-Aranha: Um Novo Dia" },
  seat: { id: "s1", label: "A1" },
};

describe("mapValidationOutcome", () => {
  it("returns valid when the ticket's event matches the selected event", () => {
    expect(mapValidationOutcome("event-1", baseResult, null)).toEqual({
      kind: "valid",
      result: baseResult,
    });
  });

  it("returns wrong_event when the ticket belongs to a different event", () => {
    expect(mapValidationOutcome("event-2", baseResult, null)).toEqual({
      kind: "wrong_event",
      result: baseResult,
    });
  });

  it("returns already_used on a 409 conflict", () => {
    const error = new ApiError(409, "CONFLICT", "Ingresso já foi utilizado");
    expect(mapValidationOutcome("event-1", null, error)).toEqual({ kind: "already_used" });
  });

  it("returns invalid on a 401 or 404 error", () => {
    expect(
      mapValidationOutcome("event-1", null, new ApiError(401, "UNAUTHORIZED", "QR code inválido")),
    ).toEqual({ kind: "invalid" });
    expect(
      mapValidationOutcome(
        "event-1",
        null,
        new ApiError(404, "NOT_FOUND", "Ingresso não encontrado"),
      ),
    ).toEqual({ kind: "invalid" });
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- --run src/features/gatekeeper/lib/map-validation-outcome.spec.ts`
Expected: FAIL (module doesn't exist)

- [ ] **Step 4: Implement mapValidationOutcome**

`src/features/gatekeeper/lib/map-validation-outcome.ts`:

```ts
import { ApiError } from "@/shared/api-client";
import { GatekeeperOutcome, ValidateTicketResult } from "../types";

export function mapValidationOutcome(
  selectedEventId: string,
  result: ValidateTicketResult | null,
  error: ApiError | null,
): GatekeeperOutcome {
  if (error) {
    if (error.statusCode === 409) return { kind: "already_used" };
    return { kind: "invalid" };
  }
  if (!result) return { kind: "invalid" };
  if (result.event.id !== selectedEventId) return { kind: "wrong_event", result };
  return { kind: "valid", result };
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- --run src/features/gatekeeper/lib/map-validation-outcome.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/gatekeeper
git commit -m "feat: add gatekeeper validation outcome mapping"
```

---

### Task 17: Gatekeeper — scanner, manual entry, result display, portaria page

**Files:**
- Create: `src/features/gatekeeper/api/gatekeeper-api.ts`
- Create: `src/features/gatekeeper/components/scanner.tsx`
- Create: `src/features/gatekeeper/components/validation-result.tsx`
- Test: `src/features/gatekeeper/components/validation-result.spec.tsx`
- Create: `src/features/gatekeeper/components/gatekeeper-view.tsx`
- Test: `src/features/gatekeeper/components/gatekeeper-view.spec.tsx`
- Modify: `src/app/portaria/page.tsx`

**Interfaces:**
- Consumes: `ValidateTicketResult`, `GatekeeperOutcome`, `mapValidationOutcome` (Task 16), `eventsApi.list` (Task 7), `RoleGate` (Task 4), `ApiError` (Task 2).
- Produces: `gatekeeperApi.validate(qrToken: string): Promise<ValidateTicketResult>` from `@/features/gatekeeper/api/gatekeeper-api`. `Scanner({ onScan: (decodedText: string) => void })` from `@/features/gatekeeper/components/scanner` (camera-based; not covered by automated tests — jsdom has no camera/`getUserMedia`, verify manually in a real browser per Step 8). `ValidationResult({ outcome: GatekeeperOutcome })` from `@/features/gatekeeper/components/validation-result`. `GatekeeperView` (no props) from `@/features/gatekeeper/components/gatekeeper-view`.

- [ ] **Step 1: Write the gatekeeper API**

`src/features/gatekeeper/api/gatekeeper-api.ts`:

```ts
import { apiClient } from "@/shared/api-client";
import { ValidateTicketResult } from "../types";

export const gatekeeperApi = {
  validate: (qrToken: string) =>
    apiClient.post<ValidateTicketResult>("/gatekeeper/validate", { qrToken }),
};
```

- [ ] **Step 2: Write the failing test for ValidationResult**

`src/features/gatekeeper/components/validation-result.spec.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ValidationResult } from "./validation-result";
import { ValidateTicketResult } from "../types";

const result: ValidateTicketResult = {
  ticket: { id: "t1", status: "used", usedAt: "2026-01-01T00:00:00Z" },
  event: { id: "event-1", title: "Homem-Aranha: Um Novo Dia" },
  seat: { id: "seat-1", label: "A1" },
};

describe("ValidationResult", () => {
  it("shows a success message with the seat for a valid ticket", () => {
    render(<ValidationResult outcome={{ kind: "valid", result }} />);
    expect(screen.getByText(/Ingresso válido/)).toBeInTheDocument();
    expect(screen.getByText(/A1/)).toBeInTheDocument();
  });

  it("warns when the ticket belongs to a different event", () => {
    render(<ValidationResult outcome={{ kind: "wrong_event", result }} />);
    expect(screen.getByText(/evento errado/i)).toBeInTheDocument();
  });

  it("shows an error for an already-used ticket", () => {
    render(<ValidationResult outcome={{ kind: "already_used" }} />);
    expect(screen.getByText(/já foi utilizado/i)).toBeInTheDocument();
  });

  it("shows an error for an invalid ticket", () => {
    render(<ValidationResult outcome={{ kind: "invalid" }} />);
    expect(screen.getByText(/inválido/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- --run src/features/gatekeeper/components/validation-result.spec.tsx`
Expected: FAIL (module doesn't exist)

- [ ] **Step 4: Implement ValidationResult**

`src/features/gatekeeper/components/validation-result.tsx`:

```tsx
import Alert from "@mui/material/Alert";
import { GatekeeperOutcome } from "../types";

export function ValidationResult({ outcome }: { outcome: GatekeeperOutcome }) {
  if (outcome.kind === "valid") {
    return (
      <Alert severity="success">Ingresso válido — assento {outcome.result.seat.label}</Alert>
    );
  }
  if (outcome.kind === "wrong_event") {
    return (
      <Alert severity="warning">
        Evento errado: este ingresso é de &quot;{outcome.result.event.title}&quot;. Ele já foi
        marcado como utilizado — negue a entrada.
      </Alert>
    );
  }
  if (outcome.kind === "already_used") {
    return <Alert severity="error">Este ingresso já foi utilizado.</Alert>;
  }
  return <Alert severity="error">Ingresso inválido.</Alert>;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- --run src/features/gatekeeper/components/validation-result.spec.tsx`
Expected: PASS

- [ ] **Step 6: Write the Scanner component (camera, not unit-tested)**

`src/features/gatekeeper/components/scanner.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

const CONTAINER_ID = "gatekeeper-scanner";

export function Scanner({ onScan }: { onScan: (decodedText: string) => void }) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    const scanner = new Html5Qrcode(CONTAINER_ID);

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => onScanRef.current(decodedText),
        undefined,
      )
      .catch(() => {
        // Câmera indisponível (permissão negada, sem hardware, etc.) — a entrada manual continua funcionando.
      });

    return () => {
      scanner
        .stop()
        .catch(() => undefined)
        .finally(() => scanner.clear());
    };
  }, []);

  return <div id={CONTAINER_ID} style={{ width: "100%", maxWidth: 360 }} />;
}
```

jsdom has no camera/`getUserMedia`, so this component is exercised manually rather than via Vitest — covered by the manual verification in Step 10, not by an automated test.

- [ ] **Step 7: Write the failing test for GatekeeperView**

`src/features/gatekeeper/components/gatekeeper-view.spec.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@test/support/render-with-providers";
import { ApiError } from "@/shared/api-client";

vi.mock("@/features/events/api/events-api", () => ({
  eventsApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        {
          id: "event-1", organizerId: "org-1", title: "Homem-Aranha: Um Novo Dia", synopsis: null,
          posterUrl: null, tmdbId: "969681", date: "2026-09-01T22:00:00Z",
          location: "Cinema Verzel - Sala 3", capacity: 24, price: "39.90", createdAt: "2026-08-01T00:00:00Z",
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
  },
}));

vi.mock("./scanner", () => ({ Scanner: () => null }));

const validateMock = vi.fn();
vi.mock("../api/gatekeeper-api", () => ({
  gatekeeperApi: { validate: (...args: unknown[]) => validateMock(...args) },
}));

import { GatekeeperView } from "./gatekeeper-view";

async function selectEvent() {
  const eventSelect = await screen.findByLabelText("Evento");
  await userEvent.click(eventSelect);
  await userEvent.click(await screen.findByText("Homem-Aranha: Um Novo Dia"));
}

describe("GatekeeperView", () => {
  beforeEach(() => {
    validateMock.mockReset();
  });

  it("validates a manually entered code against the selected event", async () => {
    validateMock.mockResolvedValue({
      ticket: { id: "t1", status: "used", usedAt: "2026-01-01T00:00:00Z" },
      event: { id: "event-1", title: "Homem-Aranha: Um Novo Dia" },
      seat: { id: "seat-1", label: "A1" },
    });
    renderWithProviders(<GatekeeperView />);
    await selectEvent();

    await userEvent.type(screen.getByLabelText("Código do ingresso"), "abc123");
    await userEvent.click(screen.getByRole("button", { name: "Validar" }));

    expect(await screen.findByText(/Ingresso válido/)).toBeInTheDocument();
    expect(validateMock).toHaveBeenCalledWith("abc123");
  });

  it("flags a ticket from a different event as evento errado", async () => {
    validateMock.mockResolvedValue({
      ticket: { id: "t1", status: "used", usedAt: "2026-01-01T00:00:00Z" },
      event: { id: "event-2", title: "Outro Filme" },
      seat: { id: "seat-1", label: "A1" },
    });
    renderWithProviders(<GatekeeperView />);
    await selectEvent();

    await userEvent.type(screen.getByLabelText("Código do ingresso"), "abc123");
    await userEvent.click(screen.getByRole("button", { name: "Validar" }));

    expect(await screen.findByText(/evento errado/i)).toBeInTheDocument();
  });

  it("shows já utilizado on a 409 conflict", async () => {
    validateMock.mockRejectedValue(new ApiError(409, "CONFLICT", "Ingresso já foi utilizado"));
    renderWithProviders(<GatekeeperView />);
    await selectEvent();

    await userEvent.type(screen.getByLabelText("Código do ingresso"), "abc123");
    await userEvent.click(screen.getByRole("button", { name: "Validar" }));

    expect(await screen.findByText(/já foi utilizado/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run to verify it fails**

Run: `npm test -- --run src/features/gatekeeper/components/gatekeeper-view.spec.tsx`
Expected: FAIL (module doesn't exist)

- [ ] **Step 9: Implement GatekeeperView**

`src/features/gatekeeper/components/gatekeeper-view.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { eventsApi } from "@/features/events/api/events-api";
import { ApiError } from "@/shared/api-client";
import { gatekeeperApi } from "../api/gatekeeper-api";
import { mapValidationOutcome } from "../lib/map-validation-outcome";
import { GatekeeperOutcome } from "../types";
import { ValidationResult } from "./validation-result";
import { Scanner } from "./scanner";

export function GatekeeperView() {
  const [eventId, setEventId] = useState("");
  const [code, setCode] = useState("");
  const [outcome, setOutcome] = useState<GatekeeperOutcome | null>(null);

  const { data: events } = useQuery({
    queryKey: ["events", "gatekeeper-list"],
    queryFn: () => eventsApi.list(),
  });

  const mutation = useMutation({
    mutationFn: (qrToken: string) => gatekeeperApi.validate(qrToken),
    onSuccess: (result) => setOutcome(mapValidationOutcome(eventId, result, null)),
    onError: (error) =>
      setOutcome(mapValidationOutcome(eventId, null, error instanceof ApiError ? error : null)),
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 480 }}>
      <FormControl>
        <InputLabel id="event-label">Evento</InputLabel>
        <Select
          labelId="event-label"
          label="Evento"
          value={eventId}
          onChange={(event) => setEventId(event.target.value)}
        >
          {(events?.data ?? []).map((event) => (
            <MenuItem key={event.id} value={event.id}>
              {event.title}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {eventId ? (
        <>
          <Scanner onScan={(decoded) => mutation.mutate(decoded)} />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Código do ingresso"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <Button variant="contained" onClick={() => mutation.mutate(code)} disabled={!code}>
              Validar
            </Button>
          </Box>
        </>
      ) : null}

      {outcome ? <ValidationResult outcome={outcome} /> : null}
    </Box>
  );
}
```

- [ ] **Step 10: Run to verify it passes**

Run: `npm test -- --run src/features/gatekeeper/components/gatekeeper-view.spec.tsx`
Expected: PASS

- [ ] **Step 11: Wire the portaria page**

`src/app/portaria/page.tsx`:

```tsx
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { RoleGate } from "@/features/auth/components/role-gate";
import { GatekeeperView } from "@/features/gatekeeper/components/gatekeeper-view";

export default function GatekeeperPage() {
  return (
    <main className="flex-1 p-8">
      <RoleGate role="gatekeeper">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Typography variant="h4" component="h1">
            Portaria
          </Typography>
          <GatekeeperView />
        </Box>
      </RoleGate>
    </main>
  );
}
```

- [ ] **Step 12: Run the full suite**

Run: `npm test`
Expected: all PASS

- [ ] **Step 13: Manually verify the camera scanner**

Run `npm run dev`, log in as `portaria@verzel.com` / `senha123`, open `/portaria` on a device/browser with a camera, grant camera permission, and confirm the video feed appears and scanning a real QR from a ticket (e.g. rendered on the `meus-ingressos` page on another device/tab) triggers validation. Confirm the manual-entry fallback still works when camera permission is denied. Note the result of this manual check in the README's "known limitations" section if anything doesn't work as expected (Task 19).

- [ ] **Step 14: Commit**

```bash
git add src/features/gatekeeper "src/app/portaria"
git commit -m "feat: implement gatekeeper scanner, manual entry, and validation result"
```

---

### Task 18: Visual identity — apply a real Material UI theme

**Files:**
- Modify: `src/shared/theme/theme.ts`
- Possibly modify: `src/features/events/components/event-card.tsx`, `src/features/tickets/components/ticket-card.tsx`, `src/features/reservations/components/seat-map.tsx` (only if the chosen direction needs component-level tweaks beyond what theme overrides cover)

**Interfaces:**
- Consumes: nothing new — replaces the placeholder `theme` from Task 1 in place, same export shape (`theme: Theme` from `@/shared/theme/theme`), so no other file's imports change.

This is the point where the spec's deferred visual-identity decision gets made concretely (`docs/superpowers/specs/2026-08-20-frontend-eventos-ingressos-design.md`, section "Identidade visual"). Everything up to this task intentionally used MUI's plain light palette so the flow could be built and tested end-to-end first, per the spec's build order.

- [ ] **Step 1: Run the frontend-design skill to establish the direction**

Invoke the `frontend-design` skill (`Skill({ skill: "frontend-design" })`) to work through concrete choices for this cinema-ticketing domain: color palette (primary/secondary/background/text, both intent and exact values), typography (a display/heading face distinct from the body face — the project already loads Geist via `next/font/google` in `src/app/layout.tsx`; decide whether to add a second Google Font for headings or lean on Geist's weight range), and component personality (card elevation/radius, button shape, the seat-map and ticket-stub visual treatment). Follow that skill's process rather than deciding these in isolation here — this task's job is to carry out its output, not to invent the direction inline.

- [ ] **Step 2: Encode the direction in theme.ts**

Replace `src/shared/theme/theme.ts`'s `createTheme(...)` call with the palette, typography, and `components` overrides decided in Step 1. Keep the file's export shape unchanged (`export const theme = createTheme({...})`) so no other file needs to change. At minimum, override:

```ts
palette: {
  mode: /* decided in Step 1 */,
  primary: { main: /* ... */ },
  secondary: { main: /* ... */ },
  background: { default: /* ... */, paper: /* ... */ },
},
typography: {
  fontFamily: /* base body font, likely still var(--font-geist-sans), ... */,
  h1: { fontFamily: /* heading font if a second one was chosen */ },
  // ...repeat for the heading variants actually used (h4, h6, subtitle1, etc.)
},
shape: {
  borderRadius: /* decided in Step 1 */,
},
components: {
  MuiButton: { styleOverrides: { root: { /* ... */ } } },
  MuiCard: { styleOverrides: { root: { /* ... */ } } },
  // any other component the chosen direction singles out
},
```

If Step 1 calls for a second Google Font for headings, add it in `src/app/layout.tsx` next to the existing `Geist`/`Geist_Mono` calls (same `next/font/google` pattern already used there) and reference its CSS variable from `typography` above.

- [ ] **Step 3: Apply any component-level adjustments the direction calls for**

If the chosen direction needs more than palette/typography/shape (e.g., a specific ticket-stub die-cut visual, or poster-forward event cards), adjust `EventCard`, `TicketCard`, and/or `SeatMap`'s `sx` props accordingly. Keep every component's existing props/behavior contract unchanged — only visuals change, so none of the existing tests from Tasks 7, 8, or 12 should need edits. If a test does need to change here, that's a signal the visual change accidentally altered behavior — reconsider the change instead of adjusting the test to match.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all PASS (no test file changes expected in this task — see Step 3)

- [ ] **Step 5: Manually verify visually**

Run `npm run dev` and check the events list, event detail/seat map, checkout, meus-ingressos, and portaria screens render with the new theme, in a real browser, both for obvious visual bugs (contrast, overflow) and for whether it actually reads as intentional rather than default-MUI — the thing the spec calls out avoiding.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: apply final visual identity via custom MUI theme"
```

---

### Task 19: README — setup, seed data, AI usage, known limitations

**Files:**
- Modify: `README.md`

**Interfaces:**
- None — documentation only.

- [ ] **Step 1: Rewrite README.md**

Replace the current placeholder README with a complete one. Keep the existing "Stack", "Configuração local", "Testes", and "Estrutura" sections' factual content (stack list, `.env.local` copy step, port `3001`, test commands) but fold in the following, which are currently missing:

```markdown
## Dados de teste (seed)

Os dados de teste são semeados pelo backend (`npm run seed` em `../case-verzel-api`) — este projeto não tem seed próprio, é só o consumidor da API. Senha `senha123` para todos:

| E-mail | Papel |
|---|---|
| `organizador@verzel.com` | Organizador |
| `cliente1@verzel.com` | Cliente |
| `cliente2@verzel.com` | Cliente |
| `portaria@verzel.com` | Portaria |

Evento semeado: "Homem-Aranha: Um Novo Dia", Cinema Verzel - Sala 3, 24 assentos disponíveis.

## Limitações conhecidas

- **"Evento errado" na portaria**: o backend (`POST /gatekeeper/validate`) não recebe nem valida contra um `eventId` — só retorna o evento a que o ingresso pertence. A tela de portaria pede pro operador selecionar o evento antes de escanear e compara o resultado no cliente; se o ingresso for de outro evento, ele já foi marcado como `used` no backend mesmo assim (não há como escopar a validação por evento sem mudar o backend).
- **Timeout de pagamento**: se a stream SSE de pagamento não emitir nenhum evento em 30s, a tela de checkout mostra uma falha genérica com opção de tentar de novo, em vez de aguardar indefinidamente.
- **`GET /reservations/:id`**: endpoint adicionado ao backend depois da primeira versão implementada, especificamente para a tela de checkout conseguir recuperar os dados da reserva em caso de F5/link direto (sem ele, esse contexto só existiria em memória do lado do cliente).

## Uso de IA

Ferramenta: Claude Code (Anthropic), do design ao código.

- **Design e planejamento**: a arquitetura deste frontend (split Server Components/TanStack Query, feature-based folders, troca de Tailwind por um tema MUI customizado, o workaround client-side pro "evento errado" na portaria, a decisão de adicionar `GET /reservations/:id`) foi discutida e decidida em sessão de brainstorming, documentada em `docs/superpowers/specs/2026-08-20-frontend-eventos-ingressos-design.md`. O contrato exato da API (endpoints, DTOs, enums, cookies, seed) foi extraído lendo o código-fonte do backend (`../case-verzel-api`), não inventado.
- **Plano de implementação**: `docs/superpowers/plans/2026-08-20-frontend-eventos-ingressos.md` quebra o trabalho em tarefas com TDD (teste antes da implementação) tarefa a tarefa — cada uma com testes reais rodados e passando antes do commit.
- **Decisões humanas explícitas ao longo do processo**: escopo restrito a filmes/assentos (não generalizar pra "shows"/pista); manter só TanStack Query (não trocar React Hook Form por TanStack Form); trocar Tailwind por Material UI com tema customizado a fundo, especificamente pra não cair na cara padrão de MUI que o case pede pra evitar; adicionar `GET /reservations/:id` no backend em vez de depender de `sessionStorage`.
- **O que não teve IA envolvida**: execução real dos testes/build (`npm test`, `npm run build`), verificação manual do fluxo de câmera na portaria (a IA não consegue testar hardware de câmera), e a decisão final de aprovar cada etapa do design/plano antes da implementação prosseguir.

_Atualizar esta seção se o processo real de implementação divergir do planejado aqui._
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document seed data, known limitations, and AI usage in README"
```
