import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@test/support/render-with-providers";
import { EventDetail } from "../types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useServerInsertedHTML: vi.fn(),
}));

vi.mock("@/features/reservations/api/reservations-api", () => ({
  reservationsApi: { create: vi.fn() },
}));

import { EventDetailView } from "./event-detail-view";

const event: EventDetail = {
  id: "event-1",
  organizerId: "org-1",
  title: "Homem-Aranha: Um Novo Dia",
  synopsis: null,
  posterUrl: null,
  tmdbId: "969681",
  date: "2026-09-01T22:00:00Z",
  location: "Cinema Verzel - Sala 3",
  capacity: 24,
  price: "39.90",
  createdAt: "2026-08-01T00:00:00Z",
  seats: [{ id: "seat-1", row: "A", number: 1, label: "A1", status: "available" }],
};

describe("EventDetailView", () => {
  it("opens the reservation drawer for the selected seat", async () => {
    renderWithProviders(<EventDetailView event={event} />);

    await userEvent.click(screen.getByRole("button", { name: "A1" }));
    await userEvent.click(screen.getByRole("button", { name: "Reservar" }));

    expect(await screen.findByRole("heading", { name: "Reservar ingresso" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar reserva" })).toBeInTheDocument();
    expect(screen.getAllByText("Homem-Aranha: Um Novo Dia").length).toBeGreaterThan(0);
  });

  it("does not render the drawer before a seat is selected", () => {
    renderWithProviders(<EventDetailView event={event} />);

    expect(screen.queryByText("Reservar ingresso")).not.toBeInTheDocument();
  });
});
