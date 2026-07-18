import { useAtomValue } from "jotai";
import { useEffect } from "react";
import {
  auctionsListAtom,
  fetchAuctionsList,
} from "../../state/auctionsListAtom";
import { LoadStatus } from "../../state/LoadStatus";

function useAuctionListState() {
  const state = useAtomValue(auctionsListAtom);
  const hasData = state.data.length > 0;

  return {
    data: state.data,
    status: state.status,
    isLoading:
      state.status === LoadStatus.Idle ||
      (state.status === LoadStatus.Loading && !hasData),
    isError: state.status === LoadStatus.Error,
    errorMessage: state.status === LoadStatus.Error ? state.errorMessage : "",
    backgroundErrorMessage:
      state.status === LoadStatus.Success && hasData ? state.errorMessage : "",
    refetch: () => fetchAuctionsList(),
  };
}

/**
 * Read-only catalog subscription (no idle fetch). Use on pages that share
 * AppShell's warm load so StrictMode / sibling mounts cannot double-fetch.
 */
export function useAuctionListReader() {
  return useAuctionListState();
}

/** Subscribes and starts an idle fetch — keep a single caller (AppShell warm). */
export function useAuctionList() {
  const list = useAuctionListState();

  useEffect(() => {
    if (list.status === LoadStatus.Idle) {
      void fetchAuctionsList();
    }
  }, [list.status]);

  return list;
}
