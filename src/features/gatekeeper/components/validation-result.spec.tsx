import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ValidationResult } from "./validation-result";
import { ValidateTicketResult } from "../types";

const result: ValidateTicketResult = {
  ticket: { id: "t1", status: "used", usedAt: "2026-01-01T00:00:00Z" },
  event: { id: "event-1", title: "Homem-Aranha: Um Novo Dia" },
  seat: { id: "seat-1", label: "A1" },
};

describe("ValidationResult", () => {
  it("shows a success message with the seat for a valid ticket", () => {
    render(<ValidationResult outcome={{ kind: "valid", result }} />);
    expect(screen.getByText(/Ingresso válido/)).toBeInTheDocument();
    expect(screen.getByText(/A1/)).toBeInTheDocument();
  });

  it("warns when the ticket belongs to a different event", () => {
    render(<ValidationResult outcome={{ kind: "wrong_event", result }} />);
    expect(screen.getByText(/evento errado/i)).toBeInTheDocument();
  });

  it("shows an error for an already-used ticket", () => {
    render(<ValidationResult outcome={{ kind: "already_used" }} />);
    expect(screen.getByText(/já foi utilizado/i)).toBeInTheDocument();
  });

  it("shows an error for an invalid ticket", () => {
    render(<ValidationResult outcome={{ kind: "invalid" }} />);
    expect(screen.getByText(/inválido/i)).toBeInTheDocument();
  });
});
