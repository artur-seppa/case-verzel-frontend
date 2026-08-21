import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@test/support/render-with-providers";
import { TicketCard } from "./ticket-card";
import { TicketDetail } from "../types";

const ticket: TicketDetail = {
  ticket: { id: "t1", qrToken: "abc123", shareToken: "share-xyz", status: "valid", createdAt: "2026-08-01T00:00:00Z" },
  event: { id: "event-1", title: "Homem-Aranha: Um Novo Dia", date: "2026-09-01T22:00:00Z", location: "Cinema Verzel - Sala 3" },
  seat: { id: "seat-1", label: "A1" },
};

describe("TicketCard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the event and seat without exposing the QR code up front", () => {
    renderWithProviders(<TicketCard ticket={ticket} />);
    expect(screen.getByText("Homem-Aranha: Um Novo Dia")).toBeInTheDocument();
    expect(screen.getByText(/Assento A1/)).toBeInTheDocument();
    expect(screen.queryByText("abc123")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver QR Code" })).toBeInTheDocument();
  });

  it("reveals the QR code and its raw token only after the button is clicked", async () => {
    renderWithProviders(<TicketCard ticket={ticket} />);

    await userEvent.click(screen.getByRole("button", { name: "Ver QR Code" }));

    expect(screen.getByText("abc123")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ocultar QR Code" })).toBeInTheDocument();
  });

  it("shows a used badge when the ticket has already been validated", () => {
    renderWithProviders(
      <TicketCard ticket={{ ...ticket, ticket: { ...ticket.ticket, status: "used" } }} />,
    );
    expect(screen.getByText("Utilizado")).toBeInTheDocument();
  });

  describe("sharing", () => {
    beforeEach(() => {
      vi.stubGlobal("location", { origin: "http://localhost:3001" });
    });

    it("copies the share link to the clipboard when the Web Share API is unavailable", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { clipboard: { writeText }, share: undefined });

      renderWithProviders(<TicketCard ticket={ticket} />);
      await userEvent.click(screen.getByRole("button", { name: "Compartilhar" }));

      expect(writeText).toHaveBeenCalledWith("http://localhost:3001/ingressos/share-xyz");
      expect(await screen.findByText("Link do ingresso copiado!")).toBeInTheDocument();
    });

    it("uses the native Web Share API when available", async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { share });

      renderWithProviders(<TicketCard ticket={ticket} />);
      await userEvent.click(screen.getByRole("button", { name: "Compartilhar" }));

      expect(share).toHaveBeenCalledWith({
        title: "Homem-Aranha: Um Novo Dia",
        url: "http://localhost:3001/ingressos/share-xyz",
      });
    });
  });
});
