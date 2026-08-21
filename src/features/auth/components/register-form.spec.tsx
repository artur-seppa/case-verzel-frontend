import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@test/support/render-with-providers";
import { ApiError } from "@/shared/api-client";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useServerInsertedHTML: vi.fn(),
}));

const registerMock = vi.fn();
vi.mock("../api/auth-api", () => ({
  authApi: { register: (input: unknown) => registerMock(input) },
}));

import { RegisterForm } from "./register-form";

describe("RegisterForm", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    registerMock.mockReset();
  });

  it("shows validation errors for a short password", async () => {
    renderWithProviders(<RegisterForm />);
    await userEvent.type(screen.getByLabelText("Senha"), "1234567");
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(await screen.findByText("A senha precisa ter pelo menos 8 caracteres")).toBeInTheDocument();
  });

  it("registers with the chosen role and redirects home on success", async () => {
    registerMock.mockResolvedValue({
      id: "1",
      name: "Ana",
      email: "ana@verzel.com",
      role: "organizer",
    });
    renderWithProviders(<RegisterForm />);

    await userEvent.type(screen.getByLabelText("Nome"), "Ana");
    await userEvent.type(screen.getByLabelText("E-mail"), "ana@verzel.com");
    await userEvent.type(screen.getByLabelText("Senha"), "senha123");
    await userEvent.click(screen.getByLabelText("Organizador"));
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() =>
      expect(registerMock).toHaveBeenCalledWith({
        name: "Ana",
        email: "ana@verzel.com",
        password: "senha123",
        role: "organizer",
      }),
    );
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/"));
  });

  it("shows a toast when the email is already registered", async () => {
    registerMock.mockRejectedValue(new ApiError(409, "CONFLICT", "email in use"));
    renderWithProviders(<RegisterForm />);

    await userEvent.type(screen.getByLabelText("Nome"), "Ana");
    await userEvent.type(screen.getByLabelText("E-mail"), "ana@verzel.com");
    await userEvent.type(screen.getByLabelText("Senha"), "senha123");
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByText("Esse e-mail já está cadastrado.")).toBeInTheDocument();
  });
});
