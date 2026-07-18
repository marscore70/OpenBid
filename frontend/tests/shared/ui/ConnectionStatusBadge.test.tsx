import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ConnectionStatusBadge } from "../../../src/shared/ui/ConnectionStatusBadge";
import { SseConnectionStatus } from "../../../src/shared/types/SseConnectionStatus";

describe("ConnectionStatusBadge", () => {
  afterEach(cleanup);

  it("reports connected state without a retry action", () => {
    render(
      <ConnectionStatusBadge
        status={SseConnectionStatus.Connected}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByRole("status").dataset.status).toBe(
      SseConnectionStatus.Connected,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("offers retry when disconnected and invokes the handler", () => {
    const onRetry = vi.fn();
    render(
      <ConnectionStatusBadge
        status={SseConnectionStatus.Disconnected}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole("status").dataset.status).toBe(
      SseConnectionStatus.Disconnected,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("omits the Retry action while Connecting even when onRetry is provided", () => {
    render(
      <ConnectionStatusBadge
        status={SseConnectionStatus.Connecting}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByRole("status").dataset.status).toBe(
      SseConnectionStatus.Connecting,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("omits the Retry action when no onRetry handler is provided", () => {
    render(<ConnectionStatusBadge status={SseConnectionStatus.Disconnected} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
