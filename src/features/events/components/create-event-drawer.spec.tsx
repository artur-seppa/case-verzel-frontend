import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@test/support/render-with-providers";

vi.mock("next/navigation", () => ({ useServerInsertedHTML: vi.fn() }));

vi.mock("@/features/catalog/api/catalog-api", () => ({
  catalogApi: {
    listNowPlaying: vi.fn().mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }),
  },
}));

vi.mock("../api/events-api", () => ({
  eventsApi: { create: vi.fn() },
}));

import { CreateEventDrawer } from "./create-event-drawer";

describe("CreateEventDrawer", () => {
  it("does not render the form when closed", () => {
    renderWithProviders(<CreateEventDrawer open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Publicar evento" })).not.toBeInTheDocument();
  });

  it("renders the create event form when open", () => {
    renderWithProviders(<CreateEventDrawer open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Novo evento")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publicar evento" })).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    renderWithProviders(<CreateEventDrawer open={true} onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));

    expect(onClose).toHaveBeenCalled();
  });
});
