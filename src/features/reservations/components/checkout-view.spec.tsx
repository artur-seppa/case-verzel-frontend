import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@test/support/render-with-providers";
import { useRouter } from "next/navigation";
import { ApiError } from "@/shared/api-client";

vi.mock("next/navigation", () => ({ useRouter: vi.fn(), useServerInsertedHTML: vi.fn() }));

vi.mock("@/features/payments/api/payments-api", () => ({
  paymentsApi: {
    requestPayment: vi.fn().mockResolvedValue({ reservationId: "res-1", status: "processing" }),
    eventsUrl: (id: string) => `http://localhost:3000/api/reservations/${id}/payment/events`,
  },
}));

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  close = vi.fn();
  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }
  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }
}

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
import { paymentsApi } from "@/features/payments/api/payments-api";

describe("CheckoutView", () => {
  it("shows the reserved event, seat and price once loaded", async () => {
    renderWithProviders(<CheckoutView reservationId="res-1" />);
    expect(await screen.findByText("Homem-Aranha: Um Novo Dia")).toBeInTheDocument();
    expect(screen.getByText(/Assento A1/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?39,90/)).toBeInTheDocument();
  });

  it("submits the card, listens for the SSE confirmation, and redirects to the ticket", async () => {
    const pushMock = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: pushMock } as unknown as ReturnType<typeof useRouter>);
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);

    renderWithProviders(<CheckoutView reservationId="res-1" />);
    await screen.findByText("Homem-Aranha: Um Novo Dia");

    await userEvent.type(screen.getByLabelText("Número do cartão"), "4111111111111111");
    await userEvent.click(screen.getByRole("button", { name: "Pagar" }));

    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    FakeEventSource.instances[0].emit({
      type: "confirmed",
      payment: { id: "p1", reservationId: "res-1", status: "approved", amount: "39.90", createdAt: "now" },
      ticket: { id: "t1", qrToken: "abc", shareToken: "xyz", status: "valid", createdAt: "now" },
    });

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/meus-ingressos"));
    vi.unstubAllGlobals();
  });

  it("shows a declined message and lets the client try again", async () => {
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);

    renderWithProviders(<CheckoutView reservationId="res-1" />);
    await screen.findByText("Homem-Aranha: Um Novo Dia");

    await userEvent.type(screen.getByLabelText("Número do cartão"), "4000000000000002");
    await userEvent.click(screen.getByRole("button", { name: "Pagar" }));

    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    FakeEventSource.instances[0].emit({
      type: "declined",
      payment: { id: "p1", reservationId: "res-1", status: "declined", amount: "39.90", createdAt: "now" },
    });

    expect(await screen.findByText("Pagamento recusado. Tente outro cartão.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pagar" })).not.toBeDisabled();
    vi.unstubAllGlobals();
  });

  it("uses a fresh idempotency key when retrying with a different card after a decline", async () => {
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);

    renderWithProviders(<CheckoutView reservationId="res-1" />);
    await screen.findByText("Homem-Aranha: Um Novo Dia");

    const callsBefore = vi.mocked(paymentsApi.requestPayment).mock.calls.length;

    await userEvent.type(screen.getByLabelText("Número do cartão"), "4000000000000002");
    await userEvent.click(screen.getByRole("button", { name: "Pagar" }));
    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    FakeEventSource.instances[0].emit({
      type: "declined",
      payment: { id: "p1", reservationId: "res-1", status: "declined", amount: "39.90", createdAt: "now" },
    });
    await screen.findByText("Pagamento recusado. Tente outro cartão.");

    await userEvent.clear(screen.getByLabelText("Número do cartão"));
    await userEvent.type(screen.getByLabelText("Número do cartão"), "4111111111111111");
    await userEvent.click(screen.getByRole("button", { name: "Pagar" }));

    await waitFor(() =>
      expect(vi.mocked(paymentsApi.requestPayment).mock.calls.length).toBe(callsBefore + 2),
    );
    const calls = vi.mocked(paymentsApi.requestPayment).mock.calls.slice(callsBefore);
    expect(calls[0][2]).not.toBe(calls[1][2]);
    vi.unstubAllGlobals();
  });

  it("still listens for the SSE confirmation when the submit itself comes back as a 409", async () => {
    const pushMock = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: pushMock } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(paymentsApi.requestPayment).mockRejectedValueOnce(
      new ApiError(409, "CONFLICT", "Pagamento já está sendo processado"),
    );
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource);

    renderWithProviders(<CheckoutView reservationId="res-1" />);
    await screen.findByText("Homem-Aranha: Um Novo Dia");

    await userEvent.type(screen.getByLabelText("Número do cartão"), "4111111111111111");
    await userEvent.click(screen.getByRole("button", { name: "Pagar" }));

    expect(
      await screen.findByText(/Seu pagamento anterior ainda está sendo processado/),
    ).toBeInTheDocument();
    await waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));

    FakeEventSource.instances[0].emit({
      type: "confirmed",
      payment: { id: "p1", reservationId: "res-1", status: "approved", amount: "39.90", createdAt: "now" },
      ticket: { id: "t1", qrToken: "abc", shareToken: "xyz", status: "valid", createdAt: "now" },
    });

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/meus-ingressos"));
    vi.unstubAllGlobals();
  });
});
