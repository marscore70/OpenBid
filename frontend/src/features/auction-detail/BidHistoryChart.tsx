import { Chart } from "primereact/chart";
import { useMemo } from "react";
import styled from "styled-components";
import type { BidHistoryEntry } from "../../shared/types/BidHistoryEntry";
import { featureFlags } from "../../config/features";
import { formatBidTimestamp } from "../../shared/format/formatBidTimestamp";

const CHART_BORDER_COLOR = "#2563eb";
const EMPTY_CHART_LABEL = "No bids yet";
const EMPTY_CHART_SUGGESTED_MAX = 100;
const CHART_MIN_HEIGHT_PX = 280;
const CHART_MAX_HEIGHT_PX = 420;

const ChartShell = styled.div`
  flex: 1;
  min-height: ${CHART_MIN_HEIGHT_PX}px;
  max-height: ${CHART_MAX_HEIGHT_PX}px;
  position: relative;
`;

type BidHistoryChartProps = {
  history: BidHistoryEntry[];
};

export function BidHistoryChart({ history }: BidHistoryChartProps) {
  const isEmpty = history.length === 0;

  const chartData = useMemo(
    () => ({
      labels: isEmpty
        ? [EMPTY_CHART_LABEL]
        : history.map((entry) => formatBidTimestamp(entry.timestamp)),
      datasets: [
        isEmpty
          ? []
          : {
              label: "Bid price",
              data: history.map((entry) => entry.amount),
              fill: false,
              borderColor: CHART_BORDER_COLOR,
              pointRadius: 3,
              tension: 0.2,
            },
      ],
    }),
    [history, isEmpty],
  );

  const chartOptions = useMemo(
    () => ({
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: !isEmpty,
        },
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 4,
          },
        },
        y: {
          beginAtZero: true,
          suggestedMax: isEmpty ? EMPTY_CHART_SUGGESTED_MAX : undefined,
        },
      },
    }),
    [isEmpty],
  );

  if (!featureFlags.bidHistoryChart) {
    return null;
  }

  return (
    <ChartShell>
      <Chart type="line" data={chartData} options={chartOptions} />
    </ChartShell>
  );
}
