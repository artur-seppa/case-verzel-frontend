import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api-client";
import { mapValidationOutcome } from "./map-validation-outcome";
import { ValidateTicketResult } from "../types";

const baseResult: ValidateTicketResult = {
  ticket: { id: "t1", status: "used", usedAt: "2026-01-01T00:00:00Z" },
  event: { id: "event-1", title: "Homem-Aranha: Um Novo Dia" },
  seat: { id: "s1", label: "A1" },
};

describe("mapValidationOutcome", () => {
  it("returns valid when the ticket's event matches the selected event", () => {
    expect(mapValidationOutcome("event-1", baseResult, null)).toEqual({
      kind: "valid",
      result: baseResult,
    });
  });

  it("returns wrong_event when the ticket belongs to a different event", () => {
    expect(mapValidationOutcome("event-2", baseResult, null)).toEqual({
      kind: "wrong_event",
      result: baseResult,
    });
  });

  it("returns already_used on a 409 conflict", () => {
    const error = new ApiError(409, "CONFLICT", "Ingresso já foi utilizado");
    expect(mapValidationOutcome("event-1", null, error)).toEqual({ kind: "already_used" });
  });

  it("returns invalid on a 401 or 404 error", () => {
    expect(
      mapValidationOutcome("event-1", null, new ApiError(401, "UNAUTHORIZED", "QR code inválido")),
    ).toEqual({ kind: "invalid" });
    expect(
      mapValidationOutcome(
        "event-1",
        null,
        new ApiError(404, "NOT_FOUND", "Ingresso não encontrado"),
      ),
    ).toEqual({ kind: "invalid" });
  });
});
