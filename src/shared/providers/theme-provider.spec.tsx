import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "./theme-provider";

describe("ThemeProvider", () => {
  it("renders children under the MUI theme without crashing", () => {
    render(
      <ThemeProvider>
        <p>conteudo</p>
      </ThemeProvider>,
    );
    expect(screen.getByText("conteudo")).toBeInTheDocument();
  });
});
