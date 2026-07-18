import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BidHistoryTable } from "../../../src/features/auction-detail/BidHistoryTable";
import { BidHistoryChart } from "../../../src/features/auction-detail/BidHistoryChart";

describe("BidHistoryTable", () => {
  it("renders empty placeholder message when history is empty", () => {
    render(<BidHistoryTable history={[]} />);
    expect(screen.getByText("No bids yet")).toBeTruthy();
    expect(screen.getByText("Bidder")).toBeTruthy();
    expect(screen.getByText("Amount")).toBeTruthy();
    expect(screen.getByText("Time")).toBeTruthy();
  });
});

describe("BidHistoryChart", () => {
  it("renders an empty chart placeholder when history is empty", () => {
    const { container } = render(<BidHistoryChart history={[]} />);
    expect(container.querySelector("canvas")).toBeTruthy();
  });
});
