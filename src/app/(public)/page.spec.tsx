import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/features/events/api/events-api", () => ({
  eventsApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        {
          id: "1",
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
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
  },
}));

import EventsPage from "./page";

describe("EventsPage", () => {
  it("renders the published events returned by the API", async () => {
    render(await EventsPage());
    expect(screen.getByText("Homem-Aranha: Um Novo Dia")).toBeInTheDocument();
  });
});
