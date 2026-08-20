import { apiClient } from "@/shared/api-client";
import { User } from "../types";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: "client" | "organizer";
}

export const authApi = {
  login: (input: LoginInput) => apiClient.post<User>("/auth/login", input),
  register: (input: RegisterInput) => apiClient.post<User>("/auth/register", input),
  logout: () => apiClient.post<void>("/auth/logout"),
  getMe: () => apiClient.get<User>("/auth/me"),
};
