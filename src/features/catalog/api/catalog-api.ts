import { apiClient } from "@/shared/api-client";
import { Paginated } from "@/shared/api-client/pagination";
import { CatalogMovie } from "../types";

export const catalogApi = {
  listNowPlaying: (page = 1) => apiClient.get<Paginated<CatalogMovie>>(`/catalog/movies?page=${page}`),
};
