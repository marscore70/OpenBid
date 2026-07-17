import { useAtomValue } from "jotai";
import { useEffect } from "react";
import {
  auctionsListAtom,
  fetchAuctionsList,
} from "../../state/auctionsListAtom";
import { LoadStatus } from "../../state/LoadStatus";

export function useAuctionList() {
  const state = useAtomValue(auctionsListAtom);

  useEffect(() => {
    if (state.status === LoadStatus.Idle) {
      void fetchAuctionsList();
    }
  }, [state.status]);

  return {
    data: state.data,
    isLoading:
      state.status === LoadStatus.Idle ||
      (state.status === LoadStatus.Loading && state.data.length === 0),
    isError: state.status === LoadStatus.Error,
    error:
      state.status === LoadStatus.Error
        ? new Error(state.errorMessage)
        : null,
    refetch: () => fetchAuctionsList(),
  };
}
