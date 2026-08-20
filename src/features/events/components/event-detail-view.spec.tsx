import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@test/support/render-with-providers";
import { ApiError } from "@/shared/api-client";
import { EventDetail } from "../types";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useServerInsertedHTML: vi.fn(),
}));

const createReservationMock = vi.fn();
vi.mock("@/features/reservations/api/reservations-api", () => ({
  reservationsApi: { create: (...args: unknown[]) => createReservationMock(...args) },
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

describe("EventDetailView reservation flow", () => {
  beforeEach(() => {
    pushMock.mockClear();
    createReservationMock.mockReset();
  });

  it("creates a reservation for the selected seat and navigates to checkout", async () => {
    createReservationMock.mockResolvedValue({
      id: "res-1",
      eventId: "event-1",
      clientId: "client-1",
      status: "pending_payment",
      expiresAt: "2026-09-01T22:10:00Z",
      createdAt: "2026-09-01T22:00:00Z",
    });
    renderWithProviders(<EventDetailView event={event} />);

    await userEvent.click(screen.getByRole("button", { name: "A1" }));
    await userEvent.click(screen.getByRole("button", { name: "Reservar" }));

    await waitFor(() =>
      expect(createReservationMock).toHaveBeenCalledWith({ eventId: "event-1", seatId: "seat-1" }),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/checkout/res-1"));
  });

  it("shows a toast when the seat was just taken by someone else", async () => {
    createReservationMock.mockRejectedValue(new ApiError(409, "CONFLICT", "seat gone"));
    renderWithProviders(<EventDetailView event={event} />);

    await userEvent.click(screen.getByRole("button", { name: "A1" }));
    await userEvent.click(screen.getByRole("button", { name: "Reservar" }));

    expect(
      await screen.findByText("Esse assento acabou de ser reservado por outra pessoa."),
    ).toBeInTheDocument();
  });
});
