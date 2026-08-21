import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventsCarousel } from "./events-carousel";
import { EventSummary } from "../types";

function buildEvent(overrides: Partial<EventSummary> = {}): EventSummary {
  return {
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
    ...overrides,
  };
}

describe("EventsCarousel", () => {
  beforeEach(() => {
    Element.prototype.scrollBy = vi.fn();
  });

  it("renders a card for every event", () => {
    const events = [
      buildEvent({ id: "1", title: "Filme A" }),
      buildEvent({ id: "2", title: "Filme B" }),
    ];

    render(<EventsCarousel events={events} />);

    expect(screen.getByText("Filme A")).toBeInTheDocument();
    expect(screen.getByText("Filme B")).toBeInTheDocument();
  });

  it("scrolls the row forward and backward when the arrow buttons are clicked", async () => {
    const user = userEvent.setup();
    render(<EventsCarousel events={[buildEvent()]} />);

    await user.click(screen.getByRole("button", { name: "Próximos eventos" }));
    await user.click(screen.getByRole("button", { name: "Eventos anteriores" }));

    expect(Element.prototype.scrollBy).toHaveBeenCalledTimes(2);
  });
});
