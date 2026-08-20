import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@test/support/render-with-providers";

vi.mock("../api/catalog-api", () => ({
  catalogApi: {
    listNowPlaying: vi.fn().mockResolvedValue({
      data: [
        { tmdbId: "969681", title: "Homem-Aranha: Um Novo Dia", synopsis: null, posterUrl: null, releaseDate: "2026-07-01" },
        { tmdbId: "1234", title: "Outro Filme", synopsis: null, posterUrl: null, releaseDate: "2026-07-15" },
      ],
      meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
    }),
  },
}));

import { MoviePicker } from "./movie-picker";

describe("MoviePicker", () => {
  it("lets the organizer search and select a movie from the catalog", async () => {
    const onChange = vi.fn();
    renderWithProviders(<MoviePicker value={null} onChange={onChange} />);

    const input = await screen.findByLabelText("Filme");
    await userEvent.type(input, "Homem");
    await waitFor(() => expect(screen.getByText("Homem-Aranha: Um Novo Dia")).toBeInTheDocument());
    await userEvent.click(screen.getByText("Homem-Aranha: Um Novo Dia"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ tmdbId: "969681", title: "Homem-Aranha: Um Novo Dia" }),
    );
  });
});
