import type { AxiosInstance } from "axios";
import type { AuctionSummary } from "../../shared/types/AuctionSummary";
import type { AuctionDetail } from "../../shared/types/AuctionDetail";
import { apiClient } from "./httpClient";

export class AuctionsService {
  constructor(private readonly client: AxiosInstance) {}

  async getAll(): Promise<AuctionSummary[]> {
    const { data } = await this.client.get<unknown>("/api/auctions");
    if (!Array.isArray(data)) {
      throw new Error("Invalid auctions response");
    }
    return data as AuctionSummary[];
  }

  async getById(id: string): Promise<AuctionDetail> {
    const { data } = await this.client.get<unknown>(
      `/api/auctions/${encodeURIComponent(id)}`,
    );
    if (!data || typeof data !== "object") {
      throw new Error("Invalid auction detail response");
    }
    return data as AuctionDetail;
  }
}

export const auctionsService = new AuctionsService(apiClient);
