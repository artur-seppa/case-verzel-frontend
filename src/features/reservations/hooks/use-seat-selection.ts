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
