import { format, isValid } from "date-fns";

const BID_TIMESTAMP_PATTERN = "dd.MM.yy HH:mm:ss";
const INVALID_TIMESTAMP_LABEL = "—";

/** Formats a Unix-ms timestamp as `dd.MM.yy HH:mm:ss` (24-hour, local time). */
export function formatBidTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  if (!isValid(date)) {
    return INVALID_TIMESTAMP_LABEL;
  }
  return format(date, BID_TIMESTAMP_PATTERN);
}
