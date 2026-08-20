import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@test/support/render-with-providers";
import { ApiError } from "@/shared/api-client";

vi.mock("@/features/events/api/events-api", () => ({
  eventsApi: {
    list: vi.fn().mockResolvedValue({
      data: [
        {
          id: "event-1", organizerId: "org-1", title: "Homem-Aranha: Um Novo Dia", synopsis: null,
          posterUrl: null, tmdbId: "969681", date: "2026-09-01T22:00:00Z",
          location: "Cinema Verzel - Sala 3", capacity: 24, price: "39.90", createdAt: "2026-08-01T00:00:00Z",
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
  },
}));

vi.mock("./scanner", () => ({ Scanner: () => null }));

const validateMock = vi.fn();
vi.mock("../api/gatekeeper-api", () => ({
  gatekeeperApi: { validate: (...args: unknown[]) => validateMock(...args) },
}));

import { GatekeeperView } from "./gatekeeper-view";

async function selectEvent() {
  const eventSelect = await screen.findByLabelText("Evento");
  await userEvent.click(eventSelect);
  await userEvent.click(await screen.findByText("Homem-Aranha: Um Novo Dia"));
}

describe("GatekeeperView", () => {
  beforeEach(() => {
    validateMock.mockReset();
  });

  it("validates a manually entered code against the selected event", async () => {
    validateMock.mockResolvedValue({
      ticket: { id: "t1", status: "used", usedAt: "2026-01-01T00:00:00Z" },
      event: { id: "event-1", title: "Homem-Aranha: Um Novo Dia" },
      seat: { id: "seat-1", label: "A1" },
    });
    renderWithProviders(<GatekeeperView />);
    await selectEvent();

    await userEvent.type(screen.getByLabelText("Código do ingresso"), "abc123");
    await userEvent.click(screen.getByRole("button", { name: "Validar" }));

    expect(await screen.findByText(/Ingresso válido/)).toBeInTheDocument();
    expect(validateMock).toHaveBeenCalledWith("abc123");
  });

  it("flags a ticket from a different event as evento errado", async () => {
    validateMock.mockResolvedValue({
      ticket: { id: "t1", status: "used", usedAt: "2026-01-01T00:00:00Z" },
      event: { id: "event-2", title: "Outro Filme" },
      seat: { id: "seat-1", label: "A1" },
    });
    renderWithProviders(<GatekeeperView />);
    await selectEvent();

    await userEvent.type(screen.getByLabelText("Código do ingresso"), "abc123");
    await userEvent.click(screen.getByRole("button", { name: "Validar" }));

    expect(await screen.findByText(/evento errado/i)).toBeInTheDocument();
  });

  it("shows já utilizado on a 409 conflict", async () => {
    validateMock.mockRejectedValue(new ApiError(409, "CONFLICT", "Ingresso já foi utilizado"));
    renderWithProviders(<GatekeeperView />);
    await selectEvent();

    await userEvent.type(screen.getByLabelText("Código do ingresso"), "abc123");
    await userEvent.click(screen.getByRole("button", { name: "Validar" }));

    expect(await screen.findByText(/já foi utilizado/i)).toBeInTheDocument();
  });
});
