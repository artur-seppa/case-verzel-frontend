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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1.5,
        position: "relative",
        pt: 7,
        pb: 2,
        // A tela: a grade de assentos fica sob o facho, como na sala.
        "&::before": {
          content: '""',
          position: "absolute",
          insetInline: 0,
          top: 0,
          height: 48,
          borderTop: "2px solid rgba(245, 241, 233, 0.5)",
          background:
            "linear-gradient(180deg, rgba(242, 181, 68, 0.22), rgba(242, 181, 68, 0) 78%)",
          pointerEvents: "none",
        },
      }}
    >
      {[...rows.entries()].map(([row, rowSeats]) => (
        <Box key={row} sx={{ display: "flex", gap: 1.5, alignItems: "center", justifyContent: "center" }}>
          <Typography
            variant="body2"
            sx={{
              width: 28,
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: "0.875rem",
              letterSpacing: "0.08em",
              color: "text.secondary",
            }}
          >
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
                sx={{
                  minWidth: 56,
                  width: 56,
                  height: 56,
                  p: 0,
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  letterSpacing: 0,
                  textTransform: "none",
                  // Formato de poltrona: encosto arredondado, base reta.
                  borderRadius: "7px 7px 3px 3px",
                  // O assento escolhido é a única lâmpada acesa da grade.
                  "&.MuiButton-contained": {
                    boxShadow:
                      "0 0 0 1px rgba(242, 181, 68, 0.55), 0 4px 18px rgba(242, 181, 68, 0.35)",
                  },
                }}
              >
                {seat.label}
              </Button>
            ))}
        </Box>
      ))}
    </Box>
  );
}
