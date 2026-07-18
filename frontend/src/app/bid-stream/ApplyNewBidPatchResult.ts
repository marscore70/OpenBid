/** Outcome of patching list or detail atoms for one new_bid event. */
export type ApplyNewBidPatchResult = {
  amountApplied: boolean;
  snipeUpdated: boolean;
};
