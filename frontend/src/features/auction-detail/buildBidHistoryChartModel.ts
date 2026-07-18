import type { BidHistoryEntry } from "../../shared/types/BidHistoryEntry";
import { formatBidTimestamp } from "../../shared/format/formatBidTimestamp";

export const CHART_BORDER_COLOR = "#2563eb";
export const EMPTY_CHART_LABEL = "No bids yet";
export const EMPTY_CHART_SUGGESTED_MAX = 100;

export type BidHistoryChartModel = {
  labels: string[];
  amounts: number[];
  isEmpty: boolean;
};

export function buildBidHistoryChartModel(
  history: BidHistoryEntry[],
): BidHistoryChartModel {
  if (history.length === 0) {
    return {
      labels: [EMPTY_CHART_LABEL],
      amounts: [],
      isEmpty: true,
    };
  }

  return {
    labels: history.map((entry) => formatBidTimestamp(entry.timestamp)),
    amounts: history.map((entry) => entry.amount),
    isEmpty: false,
  };
}
