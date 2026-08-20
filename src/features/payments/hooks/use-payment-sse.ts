"use client";

import { useCallback, useRef, useState } from "react";
import { paymentsApi } from "../api/payments-api";
import { PaymentSseEvent } from "../types";

const TIMEOUT_MS = 30_000;

export type PaymentSseStatus =
  | "idle"
  | "listening"
  | "confirmed"
  | "declined"
  | "error"
  | "timeout";

export function usePaymentSse(reservationId: string) {
  const [status, setStatus] = useState<PaymentSseStatus>("idle");
  const [event, setEvent] = useState<PaymentSseEvent | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const start = useCallback(() => {
    setStatus("listening");
    setEvent(null);
    const source = new EventSource(paymentsApi.eventsUrl(reservationId), { withCredentials: true });
    sourceRef.current = source;

    timeoutRef.current = setTimeout(() => {
      setStatus("timeout");
      stop();
    }, TIMEOUT_MS);

    source.onmessage = (message) => {
      const payload = JSON.parse(message.data) as PaymentSseEvent;
      setEvent(payload);
      setStatus(payload.type);
      stop();
    };

    source.onerror = () => {
      setStatus("error");
      stop();
    };
  }, [reservationId, stop]);

  return { status, event, start, stop };
}
