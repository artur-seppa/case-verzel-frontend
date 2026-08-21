"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { ApiError } from "@/shared/api-client";
import { getErrorMessage } from "@/shared/api-client/error-messages";
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
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [lastSseStatus, setLastSseStatus] = useState(sse.status);

  if (sse.status !== lastSseStatus) {
    setLastSseStatus(sse.status);
    if (sse.status === "declined") setIdempotencyKey(crypto.randomUUID());
  }

  const payMutation = useMutation({
    mutationFn: (cardNumber: string) =>
      paymentsApi.requestPayment(reservationId, cardNumber, idempotencyKey),
    onSuccess: () => sse.start(),
  });

  // A 409 here means the reservation is already being processed (typically
  // the first submit did go through and the SSE stream just hasn't delivered
  // its result yet) — resubmitting again would only 409 again, so this state
  // sticks until the SSE resolves or the countdown expires, rather than
  // re-enabling the form for another guaranteed-to-fail attempt.
  const isAlreadyProcessing =
    payMutation.isError &&
    payMutation.error instanceof ApiError &&
    payMutation.error.statusCode === 409;

  useEffect(() => {
    if (sse.status === "confirmed" && sse.event?.type === "confirmed") {
      router.push("/meus-ingressos");
    }
  }, [sse.status, sse.event, router]);

  useEffect(() => {
    if (isAlreadyProcessing && sse.status !== "listening") sse.start();
  }, [isAlreadyProcessing, sse]);

  if (isLoading || !reservation) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isProcessing =
    payMutation.isPending || sse.status === "listening" || isAlreadyProcessing;
  const isDisabled = isProcessing || countdown.isExpired;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 480 }}>
      <Typography variant="h4" component="h1">
        {reservation.event.title}
      </Typography>
      <Typography color="text.secondary">
        {reservation.event.location}
        {reservation.seat ? ` · Assento ${reservation.seat.label}` : null}
      </Typography>
      <Typography variant="h6">{formatPrice(reservation.event.price)}</Typography>

      {countdown.isExpired ? (
        <Alert severity="error">
          Reserva expirada. Volte ao evento e escolha outro assento.
        </Alert>
      ) : (
        <Typography color="text.secondary">Expira em {countdown.formatted}</Typography>
      )}

      <PaymentForm onSubmit={(cardNumber) => payMutation.mutate(cardNumber)} disabled={isDisabled} />

      {sse.status === "listening" ? <Alert severity="info">Processando pagamento…</Alert> : null}
      {sse.status === "declined" ? (
        <Alert severity="error">Pagamento recusado. Tente outro cartão.</Alert>
      ) : null}
      {sse.status === "error" || sse.status === "timeout" ? (
        <Alert severity="error">
          Não conseguimos confirmar o pagamento agora. Tente novamente.
        </Alert>
      ) : null}
      {isAlreadyProcessing ? (
        <Alert severity="warning">
          {getErrorMessage(payMutation.error, {
            CONFLICT:
              "Seu pagamento anterior ainda está sendo processado. Aguarde a confirmação — não é preciso enviar de novo.",
          })}
        </Alert>
      ) : null}
    </Box>
  );
}
