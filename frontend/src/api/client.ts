import axios from "axios";
import type { ApiError } from "@/types/api-error";

const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10_000,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("zoom_clone_access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize all error responses to { error, message } shape
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.data &&
      typeof error.response.data === "object"
    ) {
      const data = error.response.data as Partial<ApiError>;
      if (data.error && data.message) {
        return Promise.reject(data as ApiError);
      }
    }
    const normalized: ApiError = {
      error: "internal_server_error",
      message:
        axios.isAxiosError(error) && error.message
          ? error.message
          : "An unexpected error occurred",
    };
    return Promise.reject(normalized);
  }
);
