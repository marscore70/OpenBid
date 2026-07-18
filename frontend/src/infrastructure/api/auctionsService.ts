import type { AxiosInstance } from "axios";
import type { AuctionSummary } from "../../shared/types/AuctionSummary";
import type { AuctionDetail } from "../../shared/types/AuctionDetail";
import { apiClient } from "./httpClient";
import {
  auctionDetailSchema,
  auctionSummaryListSchema,
} from "./auctionSchemas";

export class AuctionsService {
  constructor(private readonly client: AxiosInstance) {}

  async getAll(): Promise<AuctionSummary[]> {
    const { data } = await this.client.get<unknown>("/api/auctions");
    return auctionSummaryListSchema.parse(data);
  }

  async getById(id: string): Promise<AuctionDetail> {
    const { data } = await this.client.get<unknown>(
      `/api/auctions/${encodeURIComponent(id)}`,
    );
    return auctionDetailSchema.parse(data);
  }
}

export const auctionsService = new AuctionsService(apiClient);
