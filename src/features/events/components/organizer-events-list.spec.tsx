import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@test/support/render-with-providers";

vi.mock("../api/events-api", () => ({
  eventsApi: {
    listMine: vi.fn().mockResolvedValue({
      data: [
        {
          id: "1", organizerId: "org-1", title: "Homem-Aranha: Um Novo Dia", synopsis: null,
          posterUrl: null, tmdbId: "969681", date: "2026-09-01T22:00:00Z",
          location: "Cinema Verzel - Sala 3", capacity: 24, price: "39.90", createdAt: "2026-08-01T00:00:00Z",
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
  },
}));

import { OrganizerEventsList } from "./organizer-events-list";

describe("OrganizerEventsList", () => {
  it("renders the organizer's own events", async () => {
    renderWithProviders(<OrganizerEventsList />);
    expect(await screen.findByText("Homem-Aranha: Um Novo Dia")).toBeInTheDocument();
  });

  it("shows an empty state with a call to action when there are no events yet", async () => {
    const { eventsApi } = await import("../api/events-api");
    vi.mocked(eventsApi.listMine).mockResolvedValueOnce({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    renderWithProviders(<OrganizerEventsList />);
    expect(await screen.findByText("Você ainda não publicou nenhum evento.")).toBeInTheDocument();
  });
});
