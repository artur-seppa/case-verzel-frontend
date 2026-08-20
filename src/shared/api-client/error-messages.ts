import { ApiError } from "./index";

const GENERIC_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Sua sessão expirou. Faça login novamente.",
  FORBIDDEN: "Você não tem permissão para fazer isso.",
  NOT_FOUND: "Não encontramos o que você procurava.",
  CONFLICT: "Essa ação não pôde ser concluída porque o estado mudou.",
  VALIDATION_ERROR: "Verifique os dados informados.",
  SERVICE_UNAVAILABLE: "Serviço indisponível no momento. Tente novamente em instantes.",
};

const FALLBACK_MESSAGE = "Algo deu errado. Tente novamente.";

export function getErrorMessage(
  error: unknown,
  overrides?: Partial<Record<string, string>>,
): string {
  if (!(error instanceof ApiError)) return FALLBACK_MESSAGE;
  return overrides?.[error.error] ?? GENERIC_MESSAGES[error.error] ?? FALLBACK_MESSAGE;
}

export function getValidationFieldErrors(error: unknown): Record<string, string> | null {
  if (!(error instanceof ApiError) || error.error !== "VALIDATION_ERROR") return null;

  const issues = Array.isArray(error.details) ? error.details : [error.details];
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const separatorIndex = issue.indexOf(": ");
    if (separatorIndex === -1) continue;
    fields[issue.slice(0, separatorIndex)] = issue.slice(separatorIndex + 2);
  }
  return Object.keys(fields).length > 0 ? fields : null;
}
