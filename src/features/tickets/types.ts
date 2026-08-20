export type TicketStatus = "valid" | "used";

export interface TicketDetail {
  ticket: {
    id: string;
    qrToken: string;
    shareToken: string;
    status: TicketStatus;
    createdAt: string;
  };
  event: {
    id: string;
    title: string;
    date: string;
    location: string;
  };
  seat: {
    id: string;
    label: string;
  };
}
