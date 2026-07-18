import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ConnectionStatusBadge } from "../../../src/shared/ui/ConnectionStatusBadge";
import { SseConnectionStatus } from "../../../src/shared/types/SseConnectionStatus";

describe("ConnectionStatusBadge", () => {
  afterEach(cleanup);

  it("shows Connected with no Retry action while connected", () => {
    render(
      <ConnectionStatusBadge
        status={SseConnectionStatus.Connected}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByText("Connected")).toBeTruthy();
    expect(screen.queryByText("Retry")).toBeNull();
  });

  it("shows Offline with a Retry action once disconnected, and calls onRetry when clicked", () => {
    const onRetry = vi.fn();
    render(
      <ConnectionStatusBadge
        status={SseConnectionStatus.Disconnected}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText("Offline")).toBeTruthy();

    fireEvent.click(screen.getByText("Retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("omits the Retry action when no onRetry handler is provided", () => {
    render(<ConnectionStatusBadge status={SseConnectionStatus.Disconnected} />);
    expect(screen.queryByText("Retry")).toBeNull();
  });
});
