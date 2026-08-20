"use client";

import { useQuery } from "@tanstack/react-query";
import { authApi } from "./auth-api";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.getMe,
    retry: false,
    staleTime: 60_000,
  });
}
