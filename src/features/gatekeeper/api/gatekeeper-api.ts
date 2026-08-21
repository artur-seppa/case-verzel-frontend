import { apiClient } from "@/shared/api-client";
import { ValidateTicketResult } from "../types";

export const gatekeeperApi = {
  validate: (qrToken: string) =>
    apiClient.post<ValidateTicketResult>("/gatekeeper/validate", { qrToken }),
};
