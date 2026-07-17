/** Single result from merging a new_bid into list or detail state. */
export type MergeNewBidResult<T> = {
  auction: T;
  applied: boolean;
};
