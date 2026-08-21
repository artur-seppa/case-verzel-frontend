import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient, ApiError } from "./index";

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({}),
    ...response,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("apiClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("performs a GET request with credentials included", async () => {
    const fetchMock = mockFetchOnce({ json: async () => ({ id: "1" }) });

    const result = await apiClient.get<{ id: string }>("/events");

    expect(result).toEqual({ id: "1" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith("/events")).toBe(true);
    expect(init.credentials).toBe("include");
  });

  it("sends a JSON body on POST", async () => {
    const fetchMock = mockFetchOnce({ json: async () => ({ ok: true }) });

    await apiClient.post("/reservations", { seatId: "42" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ seatId: "42" }));
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
  });

  it("returns undefined for a 204 response", async () => {
    mockFetchOnce({ status: 204 });

    const result = await apiClient.delete("/tickets/1");

    expect(result).toBeUndefined();
  });

  it("throws ApiError with the parsed error payload on a non-ok response", async () => {
    mockFetchOnce({
      ok: false,
      status: 409,
      statusText: "Conflict",
      json: async () => ({ error: "CONFLICT", message: "Assento já reservado" }),
    });

    await expect(apiClient.get("/seats/1")).rejects.toMatchObject({
      statusCode: 409,
      error: "CONFLICT",
      message: "Assento já reservado",
    });
  });

  it("falls back to generic error details when the error body can't be parsed", async () => {
    mockFetchOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => {
        throw new Error("not json");
      },
    });

    const error = await apiClient.get("/events").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      statusCode: 500,
      error: "UNKNOWN_ERROR",
      message: "Internal Server Error",
    });
  });

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
});
