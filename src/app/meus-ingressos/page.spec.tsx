import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@test/support/render-with-providers";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }), useServerInsertedHTML: vi.fn() }));

vi.mock("@/features/auth/api/use-current-user", () => ({
  useCurrentUser: () => ({
    data: { id: "client-1", name: "Ana", email: "ana@verzel.com", role: "client" },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/features/tickets/api/tickets-api", () => ({
  ticketsApi: {
    listMine: vi.fn().mockResolvedValue({
      data: [
        {
          ticket: { id: "t1", qrToken: "abc", shareToken: "xyz", status: "valid", createdAt: "2026-08-01T00:00:00Z" },
          event: { id: "event-1", title: "Homem-Aranha: Um Novo Dia", date: "2026-09-01T22:00:00Z", location: "Cinema Verzel - Sala 3" },
          seat: { id: "seat-1", label: "A1" },
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
  },
}));

import MyTicketsPage from "./page";

describe("MyTicketsPage", () => {
  it("renders the client's tickets", async () => {
    renderWithProviders(<MyTicketsPage />);
    expect(await screen.findByText("Homem-Aranha: Um Novo Dia")).toBeInTheDocument();
  });

  it("shows an empty state when there are no tickets yet", async () => {
    const { ticketsApi } = await import("@/features/tickets/api/tickets-api");
    vi.mocked(ticketsApi.listMine).mockResolvedValueOnce({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    renderWithProviders(<MyTicketsPage />);
    expect(await screen.findByText("Você ainda não tem ingressos.")).toBeInTheDocument();
  });
});
