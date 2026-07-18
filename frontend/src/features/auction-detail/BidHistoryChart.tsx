import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  type ChartConfiguration,
} from "chart.js";
import styled from "styled-components";
import type { BidHistoryEntry } from "../../shared/types/BidHistoryEntry";
import { featureFlags } from "../../config/features";
import {
  buildBidHistoryChartModel,
  CHART_BORDER_COLOR,
  EMPTY_CHART_SUGGESTED_MAX,
  EMPTY_CHART_LABEL,
} from "./buildBidHistoryChartModel";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
);

const CHART_MIN_HEIGHT_PX = 280;
const CHART_MAX_HEIGHT_PX = 420;
const EMPTY_CHART_MESSAGE = "No bids yet";

const ChartShell = styled.div`
  flex: 1;
  min-height: ${CHART_MIN_HEIGHT_PX}px;
  max-height: ${CHART_MAX_HEIGHT_PX}px;
  position: relative;
`;

const ChartCanvas = styled.canvas`
  width: 100% !important;
  height: 100% !important;
`;

const EmptyOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  color: #64748b;
  font-size: 0.95rem;
  background: linear-gradient(
    to bottom,
    rgba(248, 250, 252, 0.15),
    rgba(248, 250, 252, 0.55)
  );
`;

type BidHistoryChartProps = {
  history: BidHistoryEntry[];
};

function createEmptyChartConfig(): ChartConfiguration<"line"> {
  return {
    type: "line",
    data: {
      labels: [EMPTY_CHART_LABEL],
      datasets: [
        {
          label: "Bid price",
          data: [],
          borderColor: CHART_BORDER_COLOR,
          pointRadius: 3,
          tension: 0.2,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
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
          suggestedMax: EMPTY_CHART_SUGGESTED_MAX,
        },
      },
    },
  };
}

function applyChartModel(
  chart: Chart<"line">,
  history: BidHistoryEntry[],
): void {
  const model = buildBidHistoryChartModel(history);
  const dataset = chart.data.datasets[0];

  chart.data.labels = model.labels;
  if (dataset) {
    dataset.data = model.amounts;
  }

  const tooltip = chart.options.plugins?.tooltip;
  if (tooltip) {
    tooltip.enabled = !model.isEmpty;
  }

  const yScale = chart.options.scales?.y;
  if (yScale) {
    yScale.suggestedMax = model.isEmpty ? EMPTY_CHART_SUGGESTED_MAX : undefined;
  }

  chart.update("none");
}

export function BidHistoryChart({ history }: BidHistoryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<"line"> | null>(null);
  const isEmpty = history.length === 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const chart = new Chart(canvas, createEmptyChartConfig());
    chartRef.current = chart;
    applyChartModel(chart, history);

    return () => {
      chart.destroy();
      if (chartRef.current === chart) {
        chartRef.current = null;
      }
    };
    // Mount once; history updates are applied in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }
    applyChartModel(chartRef.current, history);
  }, [history]);

  if (!featureFlags.bidHistoryChart) {
    return null;
  }

  return (
    <ChartShell>
      <ChartCanvas ref={canvasRef} role="img" aria-label="Bid history chart" />
      {isEmpty && (
        <EmptyOverlay aria-live="polite">{EMPTY_CHART_MESSAGE}</EmptyOverlay>
      )}
    </ChartShell>
  );
}
