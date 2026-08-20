"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { EventDetail } from "../types";
import { useSeatSelection } from "@/features/reservations/hooks/use-seat-selection";
import { SeatMap } from "@/features/reservations/components/seat-map";
import { reservationsApi } from "@/features/reservations/api/reservations-api";
import { useToast } from "@/shared/ui/toast-provider";
import { getErrorMessage } from "@/shared/api-client/error-messages";

function formatPrice(price: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(price),
  );
}

export function EventDetailView({ event }: { event: EventDetail }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { selectedSeat, selectSeat } = useSeatSelection(event.seats);

  const mutation = useMutation({
    mutationFn: () => reservationsApi.create({ eventId: event.id, seatId: selectedSeat!.id }),
    onSuccess: (reservation) => router.push(`/checkout/${reservation.id}`),
    onError: (error) => {
      showToast(
        getErrorMessage(error, { CONFLICT: "Esse assento acabou de ser reservado por outra pessoa." }),
      );
    },
  });

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
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography>Assento selecionado: {selectedSeat.label}</Typography>
          <Button
            variant="contained"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Reservar
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}
