import type { AuctionSummary } from '../../shared/types/AuctionSummary';
import type { AuctionDetail } from '../../shared/types/AuctionDetail';
import { httpGet } from './httpClient';

export async function fetchAuctions(): Promise<AuctionSummary[]> {
  const data = await httpGet('/api/auctions');
  if (!Array.isArray(data)) {
    throw new Error('Invalid auctions response');
  }
  return data as AuctionSummary[];
}

export async function fetchAuctionById(id: string): Promise<AuctionDetail> {
  const data = await httpGet(`/api/auctions/${id}`);
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid auction detail response');
  }
  return data as AuctionDetail;
}
