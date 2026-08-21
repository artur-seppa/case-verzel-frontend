import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const useCurrentUserMock = vi.fn();
vi.mock("../api/use-current-user", () => ({
  useCurrentUser: () => useCurrentUserMock(),
}));

import { RoleGate } from "./role-gate";

describe("RoleGate", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    useCurrentUserMock.mockReset();
  });

  it("renders children when the user has the required role", () => {
    useCurrentUserMock.mockReturnValue({
      data: { id: "1", name: "Ana", email: "a@a.com", role: "organizer" },
      isLoading: false,
      isError: false,
    });

    render(
      <RoleGate role="organizer">
        <p>conteúdo protegido</p>
      </RoleGate>,
    );

    expect(screen.getByText("conteúdo protegido")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to /login when there is no authenticated user", () => {
    useCurrentUserMock.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    render(
      <RoleGate role="organizer">
        <p>conteúdo protegido</p>
      </RoleGate>,
    );

    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("redirects home when the user has a different role", () => {
    useCurrentUserMock.mockReturnValue({
      data: { id: "1", name: "Ana", email: "a@a.com", role: "client" },
      isLoading: false,
      isError: false,
    });

    render(
      <RoleGate role="organizer">
        <p>conteúdo protegido</p>
      </RoleGate>,
    );

    expect(replaceMock).toHaveBeenCalledWith("/");
  });

  it("shows a loading state while the user is being fetched", () => {
    useCurrentUserMock.mockReturnValue({ data: undefined, isLoading: true, isError: false });

    render(
      <RoleGate role="organizer">
        <p>conteúdo protegido</p>
      </RoleGate>,
    );

    expect(screen.queryByText("conteúdo protegido")).not.toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
