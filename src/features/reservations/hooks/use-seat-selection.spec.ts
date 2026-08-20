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
