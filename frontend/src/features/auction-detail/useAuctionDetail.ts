import { useAtomValue } from "jotai";
import { atom } from "jotai";
import { useEffect } from "react";
import {
  auctionDetailAtomFamily,
  fetchAuctionDetail,
  untrackAuctionDetailId,
  type AuctionDetailState,
} from "../../state/auctionDetailAtom";
import { LoadStatus } from "../../state/LoadStatus";

const idleDetailAtom = atom<AuctionDetailState>({
  data: null,
  status: LoadStatus.Idle,
  errorMessage: "",
});

export function useAuctionDetail(id: string | undefined) {
  const detailAtom = id ? auctionDetailAtomFamily(id) : idleDetailAtom;
  const state = useAtomValue(detailAtom);

  useEffect(() => {
    if (!id) {
      return;
    }
    if (state.status === LoadStatus.Idle) {
      void fetchAuctionDetail(id);
    }
  }, [id, state.status]);

  useEffect(() => {
    if (!id) {
      return;
    }
    return () => {
      untrackAuctionDetailId(id);
    };
  }, [id]);

  return {
    data: state.data,
    isLoading:
      Boolean(id) &&
      state.data === null &&
      (state.status === LoadStatus.Idle || state.status === LoadStatus.Loading),
    isError: state.status === LoadStatus.Error,
    errorMessage: state.status === LoadStatus.Error ? state.errorMessage : "",
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
