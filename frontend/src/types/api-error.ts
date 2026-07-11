export interface ApiError {
  error:
    | "validation_error"
    | "not_found"
    | "conflict"
    | "internal_server_error";
  message: string;
}

export function isApiError(error: unknown): error is ApiError {
  return (
    error !== null &&
    typeof error === "object" &&
    "error" in error &&
    "message" in error
  );
}
