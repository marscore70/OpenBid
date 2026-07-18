import { useAtomValue } from "jotai";
import { useEffect } from "react";
import {
  auctionDetailAtomFamily,
  fetchAuctionDetail,
} from "../../state/auctionDetailAtom";
import { LoadStatus } from "../../state/LoadStatus";

export function useAuctionDetail(id: string | undefined) {
  const auctionId = id ?? "";
  const state = useAtomValue(auctionDetailAtomFamily(auctionId));

  useEffect(() => {
    if (!id) {
      return;
    }
    if (state.status === LoadStatus.Idle) {
      void fetchAuctionDetail(id);
    }
  }, [id, state.status]);

  return {
    data: state.data,
    isLoading:
      Boolean(id) &&
      state.data === null &&
      (state.status === LoadStatus.Idle ||
        state.status === LoadStatus.Loading),
    isError: state.status === LoadStatus.Error,
    error:
      state.status === LoadStatus.Error
        ? new Error(state.errorMessage)
        : null,
    // Non-destructive: a background refetch failure keeps `status` at
    // Success (and `data` intact) but still surfaces `errorMessage`.
    backgroundErrorMessage:
      state.status === LoadStatus.Success && state.data
        ? state.errorMessage
        : "",
    refetch: () => {
      if (id) {
        return fetchAuctionDetail(id);
      }
      return Promise.resolve();
    },
  };
}
