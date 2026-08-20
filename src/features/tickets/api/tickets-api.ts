import { apiClient } from "@/shared/api-client";
import { Paginated } from "@/shared/api-client/pagination";
import { TicketDetail } from "../types";

export const ticketsApi = {
  listMine: (page = 1) => apiClient.get<Paginated<TicketDetail>>(`/tickets/mine?page=${page}`),
  get: (id: string) => apiClient.get<TicketDetail>(`/tickets/${id}`),
  getShared: (shareToken: string) => apiClient.get<TicketDetail>(`/tickets/shared/${shareToken}`),
};
