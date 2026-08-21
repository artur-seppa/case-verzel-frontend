import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@test/support/render-with-providers";
import { PaymentForm } from "./payment-form";

describe("PaymentForm", () => {
  it("shows a validation error for a card number that's too short", async () => {
    renderWithProviders(<PaymentForm onSubmit={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Número do cartão"), "123");
    await userEvent.click(screen.getByRole("button", { name: "Pagar" }));
    expect(await screen.findByText("Informe um número de cartão válido")).toBeInTheDocument();
  });

  it("calls onSubmit with the digits-only card number", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<PaymentForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Número do cartão"), "4000 0000 0000 0002");
    await userEvent.click(screen.getByRole("button", { name: "Pagar" }));
    expect(onSubmit).toHaveBeenCalledWith("4000000000000002");
  });

  it("disables the submit button while disabled prop is true", () => {
    renderWithProviders(<PaymentForm onSubmit={vi.fn()} disabled />);
    expect(screen.getByRole("button", { name: "Pagar" })).toBeDisabled();
  });
});
