import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

const replaceMock = vi.fn();
const usePathnameMock = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => usePathnameMock(),
  useServerInsertedHTML: vi.fn(),
}));

const useCurrentUserMock = vi.fn();
vi.mock("@/features/auth/api/use-current-user", () => ({
  useCurrentUser: () => useCurrentUserMock(),
}));

import { GatekeeperGuard } from "./gatekeeper-guard";

describe("GatekeeperGuard", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    usePathnameMock.mockReturnValue("/");
    useCurrentUserMock.mockReset();
  });

  it("redirects a gatekeeper away from a page that is not /portaria", async () => {
    useCurrentUserMock.mockReturnValue({
      data: { id: "1", name: "Carla", email: "carla@verzel.com", role: "gatekeeper" },
    });
    render(<GatekeeperGuard />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/portaria"));
  });

  it("does not redirect a gatekeeper already on /portaria", () => {
    usePathnameMock.mockReturnValue("/portaria");
    useCurrentUserMock.mockReturnValue({
      data: { id: "1", name: "Carla", email: "carla@verzel.com", role: "gatekeeper" },
    });
    render(<GatekeeperGuard />);

    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("does not redirect a gatekeeper on the login page", () => {
    usePathnameMock.mockReturnValue("/login");
    useCurrentUserMock.mockReturnValue({
      data: { id: "1", name: "Carla", email: "carla@verzel.com", role: "gatekeeper" },
    });
    render(<GatekeeperGuard />);

    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("does not redirect a client or an unauthenticated visitor", () => {
    useCurrentUserMock.mockReturnValue({
      data: { id: "1", name: "Ana", email: "ana@verzel.com", role: "client" },
    });
    render(<GatekeeperGuard />);
    expect(replaceMock).not.toHaveBeenCalled();

    useCurrentUserMock.mockReturnValue({ data: undefined });
    render(<GatekeeperGuard />);
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
