import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventCard } from "./event-card";
import { EventSummary } from "../types";

const event: EventSummary = {
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
};

describe("EventCard", () => {
  it("renders the event title, location and formatted price", () => {
    render(<EventCard event={event} />);
    expect(screen.getByText("Homem-Aranha: Um Novo Dia")).toBeInTheDocument();
    expect(screen.getByText(/Cinema Verzel - Sala 3/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?39,90/)).toBeInTheDocument();
  });
});
