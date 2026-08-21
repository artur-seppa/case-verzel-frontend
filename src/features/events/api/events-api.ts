import { apiClient } from "@/shared/api-client";
import { Paginated } from "@/shared/api-client/pagination";
import { CreateEventInput, EventDetail, EventSummary } from "../types";

export const eventsApi = {
  list: (page = 1, limit = 20) =>
    apiClient.get<Paginated<EventSummary>>(`/events?page=${page}&limit=${limit}`),
  get: (id: string) => apiClient.get<EventDetail>(`/events/${id}`),
  listMine: (page = 1, limit = 20) =>
    apiClient.get<Paginated<EventSummary>>(`/events/mine?page=${page}&limit=${limit}`),
  create: (input: CreateEventInput) => apiClient.post<EventSummary>("/events", input),
};
