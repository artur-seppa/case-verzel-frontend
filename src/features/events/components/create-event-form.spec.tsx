import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@test/support/render-with-providers";

vi.mock("next/navigation", () => ({ useServerInsertedHTML: vi.fn() }));

vi.mock("@/features/catalog/api/catalog-api", () => ({
  catalogApi: {
    listNowPlaying: vi.fn().mockResolvedValue({
      data: [{ tmdbId: "969681", title: "Homem-Aranha: Um Novo Dia", synopsis: null, posterUrl: null, releaseDate: "2026-07-01" }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
  },
}));

const createEventMock = vi.fn();
vi.mock("../api/events-api", () => ({
  eventsApi: { create: (...args: unknown[]) => createEventMock(...args) },
}));

import { CreateEventForm } from "./create-event-form";

describe("CreateEventForm", () => {
  beforeEach(() => {
    createEventMock.mockReset();
  });

  it("shows a validation error when capacity exceeds the seat-grid limit", async () => {
    renderWithProviders(<CreateEventForm />);
    await userEvent.type(screen.getByLabelText("Capacidade"), "300");
    await userEvent.click(screen.getByRole("button", { name: "Publicar evento" }));
    expect(await screen.findByText("A capacidade máxima é 260 lugares")).toBeInTheDocument();
  });

  it("submits the form and calls onSuccess", async () => {
    createEventMock.mockResolvedValue({
      id: "event-1",
      organizerId: "org-1",
      title: "Homem-Aranha: Um Novo Dia",
      synopsis: null,
      posterUrl: null,
      tmdbId: "969681",
      date: "2026-09-01T22:00:00.000Z",
      location: "Cinema Verzel - Sala 3",
      capacity: 24,
      price: "39.90",
      createdAt: "2026-08-01T00:00:00Z",
    });
    const onSuccess = vi.fn();
    renderWithProviders(<CreateEventForm onSuccess={onSuccess} />);

    const movieInput = await screen.findByLabelText("Filme");
    await userEvent.type(movieInput, "Homem");
    await waitFor(() => expect(screen.getByText("Homem-Aranha: Um Novo Dia")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Homem-Aranha: Um Novo Dia"));

    await userEvent.type(screen.getByLabelText("Data e hora"), "2026-09-01T22:00");
    await userEvent.type(screen.getByLabelText("Local"), "Cinema Verzel - Sala 3");
    await userEvent.type(screen.getByLabelText("Capacidade"), "24");
    await userEvent.type(screen.getByLabelText("Preço"), "39.90");
    await userEvent.click(screen.getByRole("button", { name: "Publicar evento" }));

    await waitFor(() =>
      expect(createEventMock).toHaveBeenCalledWith({
        tmdbId: "969681",
        date: "2026-09-01T22:00:00.000Z",
        location: "Cinema Verzel - Sala 3",
        capacity: 24,
        price: "39.90",
      }),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
