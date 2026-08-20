export interface EventSummary {
  id: string;
  organizerId: string;
  title: string;
  synopsis: string | null;
  posterUrl: string | null;
  tmdbId: string;
  date: string;
  location: string;
  capacity: number;
  price: string;
  createdAt: string;
}

export type SeatStatus = "available" | "held" | "sold";

export interface Seat {
  id: string;
  row: string;
  number: number;
  label: string;
  status: SeatStatus;
}

export interface EventDetail extends EventSummary {
  seats: Seat[];
}

export interface CreateEventInput {
  tmdbId: string;
  date: string;
  location: string;
  capacity: number;
  price: string;
}
