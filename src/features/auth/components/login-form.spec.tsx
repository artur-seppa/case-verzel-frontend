import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@test/support/render-with-providers";
import { ApiError } from "@/shared/api-client";

const replaceMock = vi.fn();
const searchParamsGetMock = vi.fn((): string | null => null);
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => ({ get: searchParamsGetMock }),
  useServerInsertedHTML: vi.fn(),
}));

const loginMock = vi.fn();
vi.mock("../api/auth-api", () => ({
  authApi: { login: (...args: unknown[]) => loginMock(...args) },
}));

import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    searchParamsGetMock.mockReturnValue(null);
    loginMock.mockReset();
  });

  it("shows a validation error for an empty submit", async () => {
    renderWithProviders(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Informe um e-mail válido")).toBeInTheDocument();
  });

  it("logs in and redirects to the requested page on success", async () => {
    loginMock.mockResolvedValue({ id: "1", name: "Ana", email: "ana@verzel.com", role: "client" });
    searchParamsGetMock.mockReturnValue("/meus-ingressos");
    renderWithProviders(<LoginForm />);

    await userEvent.type(screen.getByLabelText("E-mail"), "ana@verzel.com");
    await userEvent.type(screen.getByLabelText("Senha"), "senha123");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/meus-ingressos"));
  });

  it("shows a toast with a friendly message on invalid credentials", async () => {
    loginMock.mockRejectedValue(new ApiError(401, "UNAUTHORIZED", "Invalid credentials"));
    renderWithProviders(<LoginForm />);

    await userEvent.type(screen.getByLabelText("E-mail"), "ana@verzel.com");
    await userEvent.type(screen.getByLabelText("Senha"), "errada");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeInTheDocument();
  });
});
