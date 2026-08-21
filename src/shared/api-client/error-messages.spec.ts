import { describe, expect, it } from "vitest";
import { ApiError } from "./index";
import { getErrorMessage, getValidationFieldErrors } from "./error-messages";

describe("getErrorMessage", () => {
  it("returns a context-specific override when provided", () => {
    const error = new ApiError(409, "CONFLICT", "seat gone");
    expect(getErrorMessage(error, { CONFLICT: "assento indisponível" })).toBe(
      "assento indisponível",
    );
  });

  it("falls back to the generic message for the error code", () => {
    const error = new ApiError(401, "UNAUTHORIZED", "expired");
    expect(getErrorMessage(error)).toBe("Sua sessão expirou. Faça login novamente.");
  });

  it("returns a generic fallback for unknown error codes", () => {
    const error = new ApiError(500, "SOMETHING_WEIRD", "boom");
    expect(getErrorMessage(error)).toBe("Algo deu errado. Tente novamente.");
  });

  it("returns a generic fallback for non-ApiError values", () => {
    expect(getErrorMessage(new Error("network down"))).toBe("Algo deu errado. Tente novamente.");
  });
});

describe("getValidationFieldErrors", () => {
  it("parses 'field: message' entries into a field map", () => {
    const error = new ApiError(400, "VALIDATION_ERROR", [
      "email: Invalid email",
      "password: Too short",
    ]);
    expect(getValidationFieldErrors(error)).toEqual({
      email: "Invalid email",
      password: "Too short",
    });
  });

  it("returns null when the error is not a VALIDATION_ERROR", () => {
    const error = new ApiError(409, "CONFLICT", "seat gone");
    expect(getValidationFieldErrors(error)).toBeNull();
  });

  it("returns null when no entry matches the 'field: message' shape", () => {
    const error = new ApiError(400, "VALIDATION_ERROR", "generic message");
    expect(getValidationFieldErrors(error)).toBeNull();
  });
});
