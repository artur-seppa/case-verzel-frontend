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
