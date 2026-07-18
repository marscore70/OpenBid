import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BidHistoryTable } from "../../../src/features/auction-detail/BidHistoryTable";

const updateMock = vi.fn();
const destroyMock = vi.fn();

vi.mock("chart.js", () => {
  class ChartMock {
    static register = vi.fn();

    data = {
      labels: [] as string[],
      datasets: [{ data: [] as number[] }],
    };
    options = {
      plugins: {
        tooltip: { enabled: false },
        annotation: { annotations: {} },
      },
      scales: { y: { suggestedMax: undefined as number | undefined } },
    };
    update = updateMock;
    destroy = destroyMock;

    constructor() {
      // no-op: jsdom cannot host a real Chart.js canvas context
    }
  }

  return {
    Chart: ChartMock,
    LineController: class LineController {},
    LineElement: class LineElement {},
    PointElement: class PointElement {},
    LinearScale: class LinearScale {},
    CategoryScale: class CategoryScale {},
    Tooltip: class Tooltip {},
  };
});

vi.mock("chartjs-plugin-annotation", () => ({
  default: {},
}));

import { BidHistoryChart } from "../../../src/features/auction-detail/BidHistoryChart";

afterEach(() => {
  cleanup();
});

describe("BidHistoryTable", () => {
  it("renders empty placeholder message when history is empty", () => {
    render(<BidHistoryTable history={[]} />);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(screen.queryAllByRole("row")).toHaveLength(2);
  });
});

describe("BidHistoryChart", () => {
  beforeEach(() => {
    updateMock.mockClear();
    destroyMock.mockClear();
  });

  it("renders an empty chart placeholder when history is empty", () => {
    const { container } = render(
      <BidHistoryChart history={[]} startPrice={25} />,
    );
    expect(screen.getByRole("img")).toBeTruthy();
    expect(screen.getByRole("status")).toBeTruthy();
    expect(updateMock).toHaveBeenCalled();
  });
});
