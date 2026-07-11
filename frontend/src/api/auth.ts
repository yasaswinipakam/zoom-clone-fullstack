import { apiClient } from "@/api/client";

export interface AuthUser { id: number; name: string; email: string }
export interface AuthResponse { access_token: string; token_type: string; user: AuthUser }

export async function authenticate(
  action: "login" | "signup",
  payload: { email: string; password: string; name?: string }
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>(`/api/v1/auth/${action}`, payload);
  return data;
}
