import { apiClient } from "@/shared/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const paymentsApi = {
  requestPayment: (reservationId: string, cardNumber: string, idempotencyKey: string) =>
    apiClient.post<{ reservationId: string; status: string }>(
      `/reservations/${reservationId}/payment`,
      { cardNumber, idempotencyKey },
    ),
  eventsUrl: (reservationId: string) => `${API_URL}/reservations/${reservationId}/payment/events`,
};
