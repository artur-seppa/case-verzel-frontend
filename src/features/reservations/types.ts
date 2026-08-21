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
  // null once the seat hold has been released (e.g. an expired reservation) —
  // the backend no longer has a seat linked to this reservation to report.
  seat: { id: string; label: string } | null;
}
