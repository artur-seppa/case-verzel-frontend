"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { EventDetail } from "../types";
import { useSeatSelection } from "@/features/reservations/hooks/use-seat-selection";
import { SeatMap } from "@/features/reservations/components/seat-map";

function formatPrice(price: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(price),
  );
}

export function EventDetailView({ event }: { event: EventDetail }) {
  const { selectedSeat, selectSeat } = useSeatSelection(event.seats);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h4" component="h1">
        {event.title}
      </Typography>
      <Typography color="text.secondary">
        {event.location} · {formatPrice(event.price)}
      </Typography>
      <SeatMap
        seats={event.seats}
        selectedSeatId={selectedSeat?.id ?? null}
        onSelectSeat={selectSeat}
      />
      {selectedSeat ? (
        <Typography>Assento selecionado: {selectedSeat.label}</Typography>
      ) : null}
    </Box>
  );
}
