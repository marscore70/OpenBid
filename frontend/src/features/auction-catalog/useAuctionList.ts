import { useQuery } from '@tanstack/react-query';
import { fetchAuctions } from '../../infrastructure/api/auctionsApi';
import { queryKeys } from '../../shared/queryKeys';

export function useAuctionList() {
  return useQuery({
    queryKey: queryKeys.auctions,
    queryFn: fetchAuctions,
    staleTime: 5_000,
  });
}
