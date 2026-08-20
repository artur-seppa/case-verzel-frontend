import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TicketCard } from "./ticket-card";
import { TicketDetail } from "../types";

const ticket: TicketDetail = {
  ticket: { id: "t1", qrToken: "abc123", shareToken: "share-xyz", status: "valid", createdAt: "2026-08-01T00:00:00Z" },
  event: { id: "event-1", title: "Homem-Aranha: Um Novo Dia", date: "2026-09-01T22:00:00Z", location: "Cinema Verzel - Sala 3" },
  seat: { id: "seat-1", label: "A1" },
};

describe("TicketCard", () => {
  it("renders the event, seat and a QR code for the ticket", () => {
    render(<TicketCard ticket={ticket} />);
    expect(screen.getByText("Homem-Aranha: Um Novo Dia")).toBeInTheDocument();
    expect(screen.getByText(/Assento A1/)).toBeInTheDocument();
    expect(document.querySelector("svg")).toBeInTheDocument();
  });

  it("shows a used badge when the ticket has already been validated", () => {
    render(<TicketCard ticket={{ ...ticket, ticket: { ...ticket.ticket, status: "used" } }} />);
    expect(screen.getByText("Utilizado")).toBeInTheDocument();
  });
});
