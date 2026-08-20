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
                {seat.label}
              </Button>
            ))}
        </Box>
      ))}
    </Box>
  );
}
