"use client";

import { useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { reservationsApi } from "../api/reservations-api";
import { useCountdown } from "../hooks/use-countdown";

function formatPrice(price: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(price),
  );
}

export function CheckoutView({ reservationId }: { reservationId: string }) {
  const { data: reservation, isLoading } = useQuery({
    queryKey: ["reservation", reservationId],
    queryFn: () => reservationsApi.get(reservationId),
  });

  const countdown = useCountdown(reservation?.expiresAt ?? new Date().toISOString());

  if (isLoading || !reservation) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 480 }}>
      <Typography variant="h4" component="h1">
        {reservation.event.title}
      </Typography>
      <Typography color="text.secondary">
        {reservation.event.location} · Assento {reservation.seat.label}
      </Typography>
      <Typography variant="h6">{formatPrice(reservation.event.price)}</Typography>
      <Typography color={countdown.isExpired ? "error" : "text.secondary"}>
        {countdown.isExpired
          ? "Reserva expirada. Volte ao evento e escolha outro assento."
          : `Expira em ${countdown.formatted}`}
      </Typography>
    </Box>
  );
}
