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
});
