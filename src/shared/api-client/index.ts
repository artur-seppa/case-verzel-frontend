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
