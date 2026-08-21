export interface PaymentEventPayment {
  id: string;
  reservationId: string;
  status: string;
  amount: string;
  createdAt: string;
}

export interface PaymentEventTicket {
  id: string;
  qrToken: string;
  shareToken: string;
  status: string;
  createdAt: string;
}

export type PaymentSseEvent =
  | { type: "confirmed"; payment: PaymentEventPayment; ticket: PaymentEventTicket }
  | { type: "declined"; payment: PaymentEventPayment }
  | { type: "error"; message: string };
