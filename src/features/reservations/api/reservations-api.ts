import { apiClient } from "@/shared/api-client";
import { Reservation } from "../types";

export interface CreateReservationInput {
  eventId: string;
  seatId: string;
}

export const reservationsApi = {
  create: (input: CreateReservationInput) => apiClient.post<Reservation>("/reservations", input),
};
