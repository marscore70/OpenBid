import { useQuery } from '@tanstack/react-query';
import { fetchAuctionById } from '../../infrastructure/api/auctionsApi';
import { queryKeys } from '../../shared/queryKeys';

export function useAuctionDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.auctionDetail(id ?? ''),
    queryFn: () => fetchAuctionById(id ?? ''),
    enabled: Boolean(id),
  });
}
