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
import annotationPlugin from "chartjs-plugin-annotation";
import styled from "styled-components";
import type { BidHistoryEntry } from "../../shared/types/BidHistoryEntry";
import { featureFlags } from "../../config/features";
import {
  buildBidHistoryChartModel,
  CHART_BORDER_COLOR,
  EMPTY_CHART_SUGGESTED_MAX,
  EMPTY_CHART_LABEL,
} from "./buildBidHistoryChartModel";
import { buildPriceReferenceAnnotations } from "./buildPriceReferenceAnnotations";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  annotationPlugin,
);

const CHART_MIN_HEIGHT_PX = 180;
const CHART_MAX_HEIGHT_PX = 360;
const EMPTY_CHART_MESSAGE = "No bids yet";

const ChartShell = styled.div`
  flex: 1;
  min-height: ${CHART_MIN_HEIGHT_PX}px;
  max-height: ${CHART_MAX_HEIGHT_PX}px;
  position: relative;

  @media (max-height: 700px) {
    min-height: 140px;
    max-height: 220px;
  }
`;

const ChartCanvas = styled.canvas`
  width: 100% !important;
  height: 100% !important;
`;

const EmptyOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 1.5rem;
  pointer-events: none;
  color: #64748b;
  font-size: 0.95rem;
`;

type BidHistoryChartProps = {
  history: BidHistoryEntry[];
  startPrice: number;
  soldPrice?: number;
};

type ChartApplyInput = {
  history: BidHistoryEntry[];
  startPrice: number;
  soldPrice?: number;
};

function resolveSuggestedMax(input: ChartApplyInput, isEmpty: boolean): number {
  const peaks = [
    input.startPrice,
    ...(input.soldPrice !== undefined ? [input.soldPrice] : []),
  ];
  if (isEmpty) {
    return Math.max(EMPTY_CHART_SUGGESTED_MAX, ...peaks);
  }
  return Math.max(...peaks, ...input.history.map((entry) => entry.amount));
}

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
        annotation: {
          annotations: {},
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
          suggestedMax: EMPTY_CHART_SUGGESTED_MAX,
        },
      },
    },
  };
}

function applyChartModel(chart: Chart<"line">, input: ChartApplyInput): void {
  const model = buildBidHistoryChartModel(input.history);
  const dataset = chart.data.datasets[0];

  chart.data.labels = model.labels;
  if (dataset) {
    dataset.data = model.amounts;
  }

  const tooltip = chart.options.plugins?.tooltip;
  if (tooltip) {
    tooltip.enabled = !model.isEmpty;
  }

  const annotation = chart.options.plugins?.annotation;
  if (annotation) {
    annotation.annotations = buildPriceReferenceAnnotations({
      startPrice: input.startPrice,
      soldPrice: input.soldPrice,
    });
  }

  const yScale = chart.options.scales?.y;
  if (yScale) {
    yScale.suggestedMax = resolveSuggestedMax(input, model.isEmpty);
  }

  chart.update("none");
}

export function BidHistoryChart({
  history,
  startPrice,
  soldPrice,
}: BidHistoryChartProps) {
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
    applyChartModel(chart, { history, startPrice, soldPrice });

    return () => {
      chart.destroy();
      if (chartRef.current === chart) {
        chartRef.current = null;
      }
    };
    // Mount once; updates are applied in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }
    applyChartModel(chartRef.current, { history, startPrice, soldPrice });
  }, [history, startPrice, soldPrice]);

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
