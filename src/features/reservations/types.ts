export type ReservationStatus =
  | "pending_payment"
  | "processing"
  | "confirmed"
  | "cancelled"
  | "declined";

export interface Reservation {
  id: string;
  eventId: string;
  clientId: string;
  status: ReservationStatus;
  expiresAt: string;
  createdAt: string;
}
