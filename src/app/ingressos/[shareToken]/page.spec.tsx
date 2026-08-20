import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/features/tickets/api/tickets-api", () => ({
  ticketsApi: {
    getShared: vi.fn().mockResolvedValue({
      ticket: { id: "t1", qrToken: "abc", shareToken: "xyz", status: "valid", createdAt: "2026-08-01T00:00:00Z" },
      event: { id: "event-1", title: "Homem-Aranha: Um Novo Dia", date: "2026-09-01T22:00:00Z", location: "Cinema Verzel - Sala 3" },
      seat: { id: "seat-1", label: "A1" },
    }),
  },
}));

import SharedTicketPage from "./page";

describe("SharedTicketPage", () => {
  it("renders the shared ticket without requiring authentication", async () => {
    render(
      await SharedTicketPage({
        params: Promise.resolve({ shareToken: "xyz" }),
        searchParams: Promise.resolve({}),
      })
    );
    expect(screen.getByText("Homem-Aranha: Um Novo Dia")).toBeInTheDocument();
  });
});
