import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient } from "@tanstack/react-query";
import { renderWithProviders } from "@test/support/render-with-providers";

const pushMock = vi.fn();
const usePathnameMock = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => usePathnameMock(),
  useServerInsertedHTML: vi.fn(),
}));

const useCurrentUserMock = vi.fn();
vi.mock("@/features/auth/api/use-current-user", () => ({
  useCurrentUser: () => useCurrentUserMock(),
}));

const logoutMock = vi.fn();
vi.mock("@/features/auth/api/auth-api", () => ({
  authApi: { logout: (...args: unknown[]) => logoutMock(...args) },
}));

import { ProfileMenu } from "./profile-menu";

describe("ProfileMenu", () => {
  beforeEach(() => {
    pushMock.mockClear();
    logoutMock.mockReset();
    useCurrentUserMock.mockReset();
    usePathnameMock.mockReturnValue("/");
  });

  it("renders nothing on the login page", () => {
    usePathnameMock.mockReturnValue("/login");
    useCurrentUserMock.mockReturnValue({ data: undefined });
    const { container } = renderWithProviders(<ProfileMenu />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows an Entrar button when no user is authenticated", () => {
    useCurrentUserMock.mockReturnValue({ data: undefined });
    renderWithProviders(<ProfileMenu />);

    expect(screen.getByRole("link", { name: "Entrar" })).toBeInTheDocument();
  });

  it("opens the account menu with the user's info and role", async () => {
    useCurrentUserMock.mockReturnValue({
      data: { id: "1", name: "Ana Souza", email: "ana@verzel.com", role: "organizer" },
    });
    renderWithProviders(<ProfileMenu />);

    await userEvent.click(screen.getByRole("button", { name: "Conta" }));

    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByText("ana@verzel.com")).toBeInTheDocument();
    expect(screen.getByText("Organizador")).toBeInTheDocument();
  });

  it("logs out, invalidates the cached user and redirects to login when Sair is clicked", async () => {
    logoutMock.mockResolvedValue(undefined);
    useCurrentUserMock.mockReturnValue({
      data: { id: "1", name: "Ana Souza", email: "ana@verzel.com", role: "client" },
    });
    const invalidateQueriesSpy = vi.spyOn(QueryClient.prototype, "invalidateQueries");
    renderWithProviders(<ProfileMenu />);

    await userEvent.click(screen.getByRole("button", { name: "Conta" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Sair" }));

    await waitFor(() => expect(logoutMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["auth", "me"] }),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/login"));

    invalidateQueriesSpy.mockRestore();
  });
});
