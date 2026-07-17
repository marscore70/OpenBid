import { HttpError, httpPost } from './httpClient';

export type PlaceBidPayload = {
  auctionId: string;
  bidder: string;
  amount: number;
};

export type PlaceBidSuccess = {
  success: true;
  bid_id: string;
  currentBid: number;
  message: string;
};

export type PlaceBidErrorBody = {
  error?: string;
  currentBid?: number;
  winner?: string | null;
  finalPrice?: number;
};

export async function placeBid(payload: PlaceBidPayload): Promise<PlaceBidSuccess> {
  try {
    const data = await httpPost('/api/bid', payload);
    return data as PlaceBidSuccess;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw error;
  }
}

export function isPlaceBidHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}
