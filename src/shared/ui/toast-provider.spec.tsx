import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "./toast-provider";

function Consumer() {
  const { showToast } = useToast();
  return <button onClick={() => showToast("deu erro")}>disparar</button>;
}

describe("ToastProvider", () => {
  it("shows a toast message when showToast is called", async () => {
    render(
      <ToastProvider>
        <Consumer />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "disparar" }));
    expect(await screen.findByText("deu erro")).toBeInTheDocument();
  });

  it("throws when useToast is used outside a ToastProvider", () => {
    function Broken() {
      useToast();
      return null;
    }
    expect(() => render(<Broken />)).toThrow("useToast must be used within a ToastProvider");
  });
});
