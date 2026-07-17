export type FeatureFlags = {
  snipeProtection: boolean;
  bidHistoryChart: boolean;
  outbidNotifications: boolean;
  myBidsTracker: boolean;
};

export const featureFlags: FeatureFlags = {
  snipeProtection: true,
  bidHistoryChart: true,
  outbidNotifications: true,
  myBidsTracker: true,
};
