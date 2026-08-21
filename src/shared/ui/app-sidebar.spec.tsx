import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@test/support/render-with-providers";

const usePathnameMock = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
  useServerInsertedHTML: vi.fn(),
}));

const useCurrentUserMock = vi.fn();
vi.mock("@/features/auth/api/use-current-user", () => ({
  useCurrentUser: () => useCurrentUserMock(),
}));

import { AppSidebar } from "./app-sidebar";

describe("AppSidebar", () => {
  beforeEach(() => {
    useCurrentUserMock.mockReset();
    usePathnameMock.mockReturnValue("/");
  });

  it("renders nothing on the login page", () => {
    usePathnameMock.mockReturnValue("/login");
    useCurrentUserMock.mockReturnValue({ data: undefined });
    const { container } = renderWithProviders(<AppSidebar />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows guest links when no user is authenticated", () => {
    useCurrentUserMock.mockReturnValue({ data: undefined });
    renderWithProviders(<AppSidebar />);

    expect(screen.getByRole("link", { name: "Eventos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Criar conta" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Meus ingressos" })).not.toBeInTheDocument();
  });

  it("shows client links for a client user", () => {
    useCurrentUserMock.mockReturnValue({
      data: { id: "1", name: "Ana", email: "ana@verzel.com", role: "client" },
    });
    renderWithProviders(<AppSidebar />);

    expect(screen.getByRole("link", { name: "Eventos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Meus ingressos" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Criar evento" })).not.toBeInTheDocument();
  });

  it("shows organizer links for an organizer user", () => {
    useCurrentUserMock.mockReturnValue({
      data: { id: "1", name: "Bruno", email: "bruno@verzel.com", role: "organizer" },
    });
    renderWithProviders(<AppSidebar />);

    expect(screen.getByRole("link", { name: "Meus eventos" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Criar evento" })).not.toBeInTheDocument();
  });

  it("shows only the portaria link for a gatekeeper user", () => {
    useCurrentUserMock.mockReturnValue({
      data: { id: "1", name: "Carla", email: "carla@verzel.com", role: "gatekeeper" },
    });
    renderWithProviders(<AppSidebar />);

    expect(screen.getByRole("link", { name: "Portaria" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Eventos" })).not.toBeInTheDocument();
  });
});
