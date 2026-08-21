import { apiClient } from "@/shared/api-client";
import { Reservation, ReservationDetail } from "../types";

export interface CreateReservationInput {
  eventId: string;
  seatId: string;
}

export const reservationsApi = {
  create: (input: CreateReservationInput) => apiClient.post<Reservation>("/reservations", input),
  get: (id: string) => apiClient.get<ReservationDetail>(`/reservations/${id}`),
};
