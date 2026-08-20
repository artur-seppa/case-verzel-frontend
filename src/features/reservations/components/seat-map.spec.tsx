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
