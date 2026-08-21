import { ApiError } from "@/shared/api-client";
import { GatekeeperOutcome, ValidateTicketResult } from "../types";

export function mapValidationOutcome(
  selectedEventId: string,
  result: ValidateTicketResult | null,
  error: ApiError | null,
): GatekeeperOutcome {
  if (error) {
    if (error.statusCode === 409) return { kind: "already_used" };
    return { kind: "invalid" };
  }
  if (!result) return { kind: "invalid" };
  if (result.event.id !== selectedEventId) return { kind: "wrong_event", result };
  return { kind: "valid", result };
}
