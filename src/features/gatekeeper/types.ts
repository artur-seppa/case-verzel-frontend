export interface ValidateTicketResult {
  ticket: { id: string; status: "valid" | "used"; usedAt: string | null };
  event: { id: string; title: string };
  seat: { id: string; label: string };
}

export type GatekeeperOutcome =
  | { kind: "valid"; result: ValidateTicketResult }
  | { kind: "wrong_event"; result: ValidateTicketResult }
  | { kind: "already_used" }
  | { kind: "invalid" };
