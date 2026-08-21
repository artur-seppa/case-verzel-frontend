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
