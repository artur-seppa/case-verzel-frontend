"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { reservationsApi } from "../api/reservations-api";
import { useCountdown } from "../hooks/use-countdown";
import { paymentsApi } from "@/features/payments/api/payments-api";
import { usePaymentSse } from "@/features/payments/hooks/use-payment-sse";
import { PaymentForm } from "@/features/payments/components/payment-form";

function formatPrice(price: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(price),
  );
}

export function CheckoutView({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const { data: reservation, isLoading } = useQuery({
    queryKey: ["reservation", reservationId],
    queryFn: () => reservationsApi.get(reservationId),
  });

  const countdown = useCountdown(reservation?.expiresAt ?? new Date().toISOString());
  const sse = usePaymentSse(reservationId);

  const payMutation = useMutation({
    mutationFn: (cardNumber: string) => paymentsApi.requestPayment(reservationId, cardNumber),
    onSuccess: () => sse.start(),
  });

  useEffect(() => {
    if (sse.status === "confirmed") {
      router.push("/meus-ingressos");
    }
  }, [sse.status, router]);

  if (isLoading || !reservation) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isProcessing = payMutation.isPending || sse.status === "listening";

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

      <PaymentForm onSubmit={(cardNumber) => payMutation.mutate(cardNumber)} disabled={isProcessing} />

      {sse.status === "listening" ? <Typography>Processando pagamento…</Typography> : null}
      {sse.status === "declined" ? (
        <Typography color="error">Pagamento recusado. Tente outro cartão.</Typography>
      ) : null}
      {sse.status === "error" || sse.status === "timeout" ? (
        <Typography color="error">
          Não conseguimos confirmar o pagamento agora. Tente novamente.
        </Typography>
      ) : null}
    </Box>
  );
}
