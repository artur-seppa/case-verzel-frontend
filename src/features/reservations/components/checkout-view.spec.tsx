import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@test/support/render-with-providers";

vi.mock("../api/reservations-api", () => ({
  reservationsApi: {
    get: vi.fn().mockResolvedValue({
      id: "res-1",
      status: "pending_payment",
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      createdAt: new Date().toISOString(),
      event: {
        id: "event-1",
        title: "Homem-Aranha: Um Novo Dia",
        posterUrl: null,
        date: "2026-09-01T22:00:00Z",
        location: "Cinema Verzel - Sala 3",
        price: "39.90",
      },
      seat: { id: "seat-1", label: "A1" },
    }),
  },
}));

import { CheckoutView } from "./checkout-view";

describe("CheckoutView", () => {
  it("shows the reserved event, seat and price once loaded", async () => {
    renderWithProviders(<CheckoutView reservationId="res-1" />);
    expect(await screen.findByText("Homem-Aranha: Um Novo Dia")).toBeInTheDocument();
    expect(screen.getByText(/Assento A1/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?39,90/)).toBeInTheDocument();
  });
});
