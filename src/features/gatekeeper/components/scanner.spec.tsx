import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

let isScanningState = false;
let resolveStart: (() => void) | undefined;
const stopMock = vi.fn(() => Promise.resolve());
const clearMock = vi.fn();
const startMock = vi.fn(
  () =>
    new Promise<void>((resolve) => {
      resolveStart = () => {
        isScanningState = true;
        resolve();
      };
    }),
);

vi.mock("html5-qrcode", () => ({
  Html5Qrcode: vi.fn().mockImplementation(function FakeHtml5Qrcode() {
    return {
      start: startMock,
      stop: stopMock,
      clear: clearMock,
      get isScanning() {
        return isScanningState;
      },
    };
  }),
}));

import { Scanner } from "./scanner";

describe("Scanner", () => {
  beforeEach(() => {
    isScanningState = false;
    resolveStart = undefined;
    startMock.mockClear();
    stopMock.mockClear();
    clearMock.mockClear();
  });

  it("does not call stop when unmounted before the camera finishes starting", () => {
    const { unmount } = render(<Scanner onScan={vi.fn()} />);
    unmount();

    expect(stopMock).not.toHaveBeenCalled();
    expect(clearMock).toHaveBeenCalled();
  });

  it("stops the scanner when unmounted after the camera is running", async () => {
    const { unmount } = render(<Scanner onScan={vi.fn()} />);
    await act(async () => resolveStart?.());

    unmount();

    expect(stopMock).toHaveBeenCalled();
  });

  it("stops the scanner if the camera finishes starting only after unmount", async () => {
    const { unmount } = render(<Scanner onScan={vi.fn()} />);
    unmount();

    await act(async () => resolveStart?.());

    expect(stopMock).toHaveBeenCalled();
  });
});
