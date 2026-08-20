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

export interface ReservationDetail {
  id: string;
  status: ReservationStatus;
  expiresAt: string;
  createdAt: string;
  event: {
    id: string;
    title: string;
    posterUrl: string | null;
    date: string;
    location: string;
    price: string;
  };
  seat: { id: string; label: string };
}
